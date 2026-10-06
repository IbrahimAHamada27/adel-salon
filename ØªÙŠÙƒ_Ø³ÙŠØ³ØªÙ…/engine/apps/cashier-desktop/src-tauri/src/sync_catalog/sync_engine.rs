use crate::local_database::db::{
    LocalCatalogItem, LocalCategory, LocalDatabase, LocalEmployee, LocalGroup,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Deserialize)]
struct RemoteCatalogResponse {
    #[serde(rename = "generatedAt")]
    generated_at: String,
    version: i64,
    categories: Vec<RemoteCategory>,
    groups: Vec<RemoteGroup>,
    items: Vec<RemoteItem>,
}

#[derive(Debug, Deserialize)]
struct RemoteCategory {
    id: String,
    name: String,
    #[serde(rename = "colorCode")]
    color_code: Option<String>,
    icon: Option<String>,
    #[serde(rename = "sortOrder")]
    sort_order: i32,
}

#[derive(Debug, Deserialize)]
struct RemoteGroup {
    id: String,
    #[serde(rename = "categoryId")]
    category_id: String,
    name: String,
    #[serde(rename = "sortOrder")]
    sort_order: i32,
}

#[derive(Debug, Deserialize)]
struct RemoteItem {
    id: String,
    #[serde(rename = "groupId")]
    group_id: String,
    #[serde(rename = "type")]
    item_type: String,
    name: String,
    #[serde(rename = "basePrice")]
    base_price: f64,
    sku: Option<String>,
    #[serde(rename = "sortOrder")]
    sort_order: i32,
    #[serde(rename = "internalNote")]
    internal_note: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RemoteEmployeesResponse {
    #[serde(rename = "generatedAt")]
    _generated_at: String,
    employees: Vec<RemoteEmployee>,
}

#[derive(Debug, Deserialize)]
struct RemoteEmployee {
    id: String,
    name: String,
    #[serde(rename = "roleTitle")]
    role_title: Option<String>,
    #[serde(rename = "sortOrder")]
    sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub success: bool,
    pub categories_count: usize,
    pub groups_count: usize,
    pub items_count: usize,
    pub employees_count: usize,
    pub synced_at: String,
    pub message: String,
}

pub struct CatalogSyncEngine;

impl CatalogSyncEngine {
    pub async fn sync_catalog(
        db: Arc<LocalDatabase>,
        api_base_url: &str,
        token: &str,
    ) -> Result<SyncResult, String> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .map_err(|e| format!("فشل إنشاء عميل الاتصال: {}", e))?;

        let catalog_url = format!("{}/cashier/catalog/snapshot", api_base_url.trim_end_matches('/'));
        let employees_url = format!("{}/cashier/employees/snapshot", api_base_url.trim_end_matches('/'));

        // 1. Fetch catalog snapshot
        let cat_res = client
            .get(&catalog_url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .map_err(|e| format!("تعذر الاتصال بالخادم لجلب الكتالوج: {}", e))?;

        if !cat_res.status().is_success() {
            return Err(format!("رد الخادم بخطأ: {}", cat_res.status()));
        }

        let cat_data: RemoteCatalogResponse = cat_res
            .json()
            .await
            .map_err(|e| format!("فشل تحليل بيانات الكتالوج: {}", e))?;

        // 2. Fetch active employees snapshot
        let emp_res = client
            .get(&employees_url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .map_err(|e| format!("تعذر الاتصال بالخادم لجلب الحلاقين: {}", e))?;

        let mut employees_count = 0;
        if emp_res.status().is_success() {
            if let Ok(emp_data) = emp_res.json::<RemoteEmployeesResponse>().await {
                let local_emps: Vec<LocalEmployee> = emp_data
                    .employees
                    .into_iter()
                    .map(|e| LocalEmployee {
                        id: e.id,
                        name: e.name,
                        role_title: e.role_title,
                        sort_order: e.sort_order,
                    })
                    .collect();
                employees_count = local_emps.len();
                let _ = db.replace_employees(&local_emps);
            }
        }

        // Map to local types
        let local_categories: Vec<LocalCategory> = cat_data
            .categories
            .into_iter()
            .map(|c| LocalCategory {
                id: c.id,
                name: c.name,
                color_code: c.color_code,
                icon: c.icon,
                sort_order: c.sort_order,
            })
            .collect();

        let local_groups: Vec<LocalGroup> = cat_data
            .groups
            .into_iter()
            .map(|g| LocalGroup {
                id: g.id,
                category_id: g.category_id,
                name: g.name,
                sort_order: g.sort_order,
            })
            .collect();

        let local_items: Vec<LocalCatalogItem> = cat_data
            .items
            .into_iter()
            .map(|i| LocalCatalogItem {
                id: i.id,
                group_id: i.group_id,
                r#type: i.item_type,
                name: i.name,
                base_price: i.base_price,
                sku: i.sku,
                sort_order: i.sort_order,
                internal_note: i.internal_note,
            })
            .collect();

        let cat_len = local_categories.len();
        let grp_len = local_groups.len();
        let itm_len = local_items.len();

        db.replace_catalog(
            &local_categories,
            &local_groups,
            &local_items,
            cat_data.version,
            &cat_data.generated_at,
        )?;

        Ok(SyncResult {
            success: true,
            categories_count: cat_len,
            groups_count: grp_len,
            items_count: itm_len,
            employees_count,
            synced_at: cat_data.generated_at,
            message: "تم تحديث وحفظ الكتالوج المحلي المشفر بنجاح".to_string(),
        })
    }
}
