use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;

pub struct SecureKeyStore;

impl SecureKeyStore {
    /// Gets or generates a machine-bound secure encryption key for SQLCipher
    pub fn get_or_create_db_key(app_data_dir: &PathBuf) -> Result<String, String> {
        let key_file = app_data_dir.join(".tech_vault.key");

        if key_file.exists() {
            let existing_key = fs::read_to_string(&key_file)
                .map_err(|e| format!("فشل في قراءة مفتاح التشفير الآمن: {}", e))?;
            let trimmed = existing_key.trim();
            if !trimmed.is_empty() {
                return Ok(trimmed.to_string());
            }
        }

        // Generate a new secure 256-bit encryption key
        let mut hasher = Sha256::new();
        hasher.update(uuid::Uuid::new_v4().as_bytes());
        hasher.update(chrono::Utc::now().to_rfc3339().as_bytes());
        
        // Machine entropy from system environment
        if let Ok(user) = std::env::var("USERNAME") {
            hasher.update(user.as_bytes());
        }
        if let Ok(computer) = std::env::var("COMPUTERNAME") {
            hasher.update(computer.as_bytes());
        }

        let hash_result = hasher.finalize();
        let key_hex = format!("{:x}", hash_result);

        if let Some(parent) = key_file.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("فشل إنشاء مجلد المفاتيح: {}", e))?;
        }

        fs::write(&key_file, &key_hex)
            .map_err(|e| format!("فشل حفظ مفتاح التشفير الآمن: {}", e))?;

        Ok(key_hex)
    }
}
