use crate::local_database::db::LocalDatabase;
use crate::sync_catalog::sync_engine::{CatalogSyncEngine, SyncResult};
use serde::Serialize;
use std::sync::Arc;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct ConnectivityStatus {
    pub is_online: bool,
    pub server_reachable: bool,
    pub server_time: Option<String>,
    pub latency_ms: Option<u64>,
    pub message: String,
}

#[tauri::command]
pub async fn sync_catalog_from_server(
    db: State<'_, Arc<LocalDatabase>>,
    api_url: String,
    token: String,
) -> Result<SyncResult, String> {
    CatalogSyncEngine::sync_catalog(db.inner().clone(), &api_url, &token).await
}

#[tauri::command]
pub async fn check_connectivity(api_url: String) -> Result<ConnectivityStatus, String> {
    let start = std::time::Instant::now();
    let health_url = format!("{}/cashier/health", api_url.trim_end_matches('/'));

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| format!("فشل عميل الشبكة: {}", e))?;

    match client.get(&health_url).send().await {
        Ok(res) if res.status().is_success() => {
            let latency = start.elapsed().as_millis() as u64;
            let json: serde_json::Value = res.json().await.unwrap_or_default();
            let server_time = json["timestamp"].as_str().map(|s| s.to_string());

            Ok(ConnectivityStatus {
                is_online: true,
                server_reachable: true,
                server_time,
                latency_ms: Some(latency),
                message: "متصل بالخادم".to_string(),
            })
        }
        _ => Ok(ConnectivityStatus {
            is_online: false,
            server_reachable: false,
            server_time: None,
            latency_ms: None,
            message: "غير متصل بالخادم (العمل بالوضع غير المتصل)".to_string(),
        }),
    }
}
