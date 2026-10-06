use crate::local_database::db::{LocalCatalogData, LocalDatabase, LocalEmployee};
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub fn get_local_catalog(
    db: State<'_, Arc<LocalDatabase>>,
) -> Result<LocalCatalogData, String> {
    db.get_catalog()
}

#[tauri::command]
pub fn get_local_employees(
    db: State<'_, Arc<LocalDatabase>>,
) -> Result<Vec<LocalEmployee>, String> {
    db.get_employees()
}
