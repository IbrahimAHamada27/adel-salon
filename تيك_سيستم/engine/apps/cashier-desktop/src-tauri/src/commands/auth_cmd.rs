use crate::local_database::db::{LocalDatabase, LocalSession};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

#[derive(Debug, Deserialize)]
pub struct LoginPayload {
    pub username: String,
    pub password: String,
    #[serde(rename = "apiUrl")]
    pub api_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub success: bool,
    pub user: Option<SessionUser>,
    pub token: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionUser {
    pub id: String,
    pub name: String,
    pub username: String,
    pub role: String,
}

#[derive(Debug, Deserialize)]
struct RemoteLoginResponse {
    user: RemoteUser,
    token: String,
}

#[derive(Debug, Deserialize)]
struct RemoteUser {
    id: String,
    name: String,
    username: String,
    role: String,
}

#[tauri::command]
pub async fn login_cashier(
    db: State<'_, Arc<LocalDatabase>>,
    payload: LoginPayload,
) -> Result<AuthResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("فشل إنشاء عميل الاتصال: {}", e))?;

    let login_url = format!("{}/cashier/auth/login", payload.api_url.trim_end_matches('/'));

    let res = client
        .post(&login_url)
        .json(&serde_json::json!({
            "username": payload.username,
            "password": payload.password
        }))
        .send()
        .await
        .map_err(|e| format!("تعذر الاتصال بالخادم، يرجى التحقق من اتصال الشبكة: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let err_body = res.text().await.unwrap_or_default();
        
        let parsed_message = if let Ok(json) = serde_json::from_str::<serde_json::Value>(&err_body) {
            json["message"].as_str().unwrap_or("بيانات تسجيل الدخول غير صحيحة").to_string()
        } else {
            "فشل تسجيل الدخول".to_string()
        };

        return Err(format!("{}: {}", status, parsed_message));
    }

    let data: RemoteLoginResponse = res
        .json()
        .await
        .map_err(|e| format!("فشل قراءة رد المصادقة: {}", e))?;

    let now = chrono::Utc::now().to_rfc3339();

    let session = LocalSession {
        cashier_id: data.user.id.clone(),
        cashier_name: data.user.name.clone(),
        cashier_username: data.user.username.clone(),
        token: data.token.clone(),
        last_active: now,
    };

    db.save_session(&session)?;

    Ok(AuthResponse {
        success: true,
        user: Some(SessionUser {
            id: data.user.id,
            name: data.user.name,
            username: data.user.username,
            role: data.user.role,
        }),
        token: Some(data.token),
        message: Some("تم تسجيل الدخول بنجاح".to_string()),
    })
}

#[tauri::command]
pub fn get_local_session(
    db: State<'_, Arc<LocalDatabase>>,
) -> Result<Option<LocalSession>, String> {
    db.get_session()
}

#[tauri::command]
pub fn logout_cashier(
    db: State<'_, Arc<LocalDatabase>>,
) -> Result<bool, String> {
    db.clear_session()?;
    Ok(true)
}
