use super::schema::INIT_SCHEMA;
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalSession {
    pub cashier_id: String,
    pub cashier_name: String,
    pub cashier_username: String,
    pub token: String,
    pub last_active: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalCategory {
    pub id: String,
    pub name: String,
    pub color_code: Option<String>,
    pub icon: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalGroup {
    pub id: String,
    pub category_id: String,
    pub name: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalCatalogItem {
    pub id: String,
    pub group_id: String,
    pub r#type: String,
    pub name: String,
    pub base_price: f64,
    pub sku: Option<String>,
    pub sort_order: i32,
    pub internal_note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalEmployee {
    pub id: String,
    pub name: String,
    pub role_title: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalCustomer {
    pub local_id: String,
    pub full_name: String,
    pub phone_number: Option<String>,
    pub birth_date: Option<String>,
    pub internal_note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub created_by_cashier_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalLineAdjustment {
    pub local_id: String,
    pub invoice_line_local_id: String,
    pub adjustment_type: String,
    pub original_price_before: f64,
    pub resulting_price_after: f64,
    pub input_value: f64,
    pub reason: Option<String>,
    pub performed_by_cashier_id: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalInvoiceLine {
    pub local_id: String,
    pub invoice_local_id: String,
    pub catalog_item_id: String,
    pub item_type: String,
    pub item_name_snapshot: String,
    pub original_unit_price_snapshot: f64,
    pub quantity: i32,
    pub assigned_employee_id: Option<String>,
    pub assigned_employee_name_snapshot: Option<String>,
    pub internal_note: Option<String>,
    pub line_subtotal: f64,
    pub line_final_total: f64,
    pub created_at: String,
    pub updated_at: String,
    pub active_adjustment: Option<LocalLineAdjustment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalPayment {
    pub local_id: String,
    pub invoice_local_id: String,
    pub payment_method: String,
    pub amount: f64,
    pub cash_received_amount: Option<f64>,
    pub change_amount: Option<f64>,
    pub reference_note: Option<String>,
    pub created_at: String,
    pub created_by_cashier_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalPaymentInput {
    pub payment_method: String,
    pub amount: f64,
    pub cash_received_amount: Option<f64>,
    pub reference_note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalInvoice {
    pub local_id: String,
    pub invoice_number_local: i64,
    pub status: String,
    pub customer_local_id: Option<String>,
    pub customer: Option<LocalCustomer>,
    pub cashier_user_id: String,
    pub shift_local_id: Option<String>,
    pub subtotal: f64,
    pub total_discount: f64,
    pub total_surcharge: f64,
    pub total: f64,
    pub internal_note: Option<String>,
    pub paid_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub lines: Vec<LocalInvoiceLine>,
    pub payments: Vec<LocalPayment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalShift {
    pub local_id: String,
    pub cashier_user_id: String,
    pub cashier_display_name_snapshot: String,
    pub status: String,
    pub opened_at: String,
    pub closed_at: Option<String>,
    pub opening_cash_amount: f64,
    pub expected_cash_amount: f64,
    pub actual_cash_amount: Option<f64>,
    pub cash_difference_amount: Option<f64>,
    pub closing_note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalExpense {
    pub local_id: String,
    pub shift_local_id: String,
    pub amount: f64,
    pub category: String,
    pub internal_note: Option<String>,
    pub attachment_local_path: Option<String>,
    pub payment_source: String,
    pub status: String,
    pub created_at: String,
    pub created_by_cashier_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShiftSummary {
    pub shift_id: String,
    pub opening_cash: f64,
    pub cash_sales: f64,
    pub non_cash_sales: f64,
    pub total_sales: f64,
    pub cash_expenses: f64,
    pub expected_cash: f64,
    pub paid_invoices_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalCatalogData {
    pub categories: Vec<LocalCategory>,
    pub groups: Vec<LocalGroup>,
    pub items: Vec<LocalCatalogItem>,
    pub last_synced_at: Option<String>,
    pub version: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalAuditEvent {
    pub id: String,
    pub actor_user_id: Option<String>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: String,
    pub before_data: Option<String>,
    pub after_data: Option<String>,
    pub reason: Option<String>,
    pub created_at: String,
}

pub struct LocalDatabase {
    conn: Mutex<Connection>,
}

impl LocalDatabase {
    pub fn new(db_path: PathBuf, encryption_key: &str) -> Result<Self, String> {
        if let Some(parent) = db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let conn = Connection::open(&db_path)
            .map_err(|e| format!("فشل فتح قاعدة البيانات المحلية: {}", e))?;

        // Apply SQLCipher encryption key pragma
        conn.execute(&format!("PRAGMA key = '{}';", encryption_key), [])
            .map_err(|e| format!("فشل تعيين مفتاح التشفير لقاعدة البيانات: {}", e))?;

        // Performance & safety pragmas
        conn.execute_batch(
            "PRAGMA cipher_page_size = 4096;
             PRAGMA kdf_iter = 64000;
             PRAGMA journal_mode = WAL;
             PRAGMA foreign_keys = ON;
             PRAGMA synchronous = NORMAL;",
        )
        .map_err(|e| format!("فشل تطبيق معايير الأمان المحلية: {}", e))?;

        conn.execute_batch(INIT_SCHEMA)
            .map_err(|e| format!("فشل تهيئة جداول قاعدة البيانات المحلية: {}", e))?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    // --- Session Management ---
    pub fn save_session(&self, session: &LocalSession) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO local_session (id, cashier_id, cashier_name, cashier_username, token, last_active)
             VALUES ('CURRENT', ?1, ?2, ?3, ?4, ?5)",
            params![
                session.cashier_id,
                session.cashier_name,
                session.cashier_username,
                session.token,
                session.last_active
            ],
        )
        .map_err(|e| format!("فشل حفظ جلسة الكاشير المحلية: {}", e))?;
        Ok(())
    }

    pub fn get_session(&self) -> Result<Option<LocalSession>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare("SELECT cashier_id, cashier_name, cashier_username, token, last_active FROM local_session WHERE id = 'CURRENT'")
            .map_err(|e| format!("فشل الاستعلام عن الجلسة: {}", e))?;

        let mut rows = stmt
            .query([])
            .map_err(|e| format!("فشل قراءة صفوف الجلسة: {}", e))?;

        if let Some(row) = rows.next().map_err(|e| format!("خطأ: {}", e))? {
            Ok(Some(LocalSession {
                cashier_id: row.get(0).unwrap_or_default(),
                cashier_name: row.get(1).unwrap_or_default(),
                cashier_username: row.get(2).unwrap_or_default(),
                token: row.get(3).unwrap_or_default(),
                last_active: row.get(4).unwrap_or_default(),
            }))
        } else {
            Ok(None)
        }
    }

    pub fn clear_session(&self) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM local_session WHERE id = 'CURRENT'", [])
            .map_err(|e| format!("فشل تسجيل الخروج ومسح الجلسة: {}", e))?;
        Ok(())
    }

    // --- Catalog Storage & Retrieval ---
    pub fn replace_catalog(
        &self,
        categories: &[LocalCategory],
        groups: &[LocalGroup],
        items: &[LocalCatalogItem],
        version: i64,
        synced_at: &str,
    ) -> Result<(), String> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn
            .transaction()
            .map_err(|e| format!("فشل بدء المعاملة: {}", e))?;

        tx.execute("DELETE FROM cached_items", [])
            .map_err(|e| format!("فشل تنظيف العناصر: {}", e))?;
        tx.execute("DELETE FROM cached_groups", [])
            .map_err(|e| format!("فشل تنظيف المجموعات: {}", e))?;
        tx.execute("DELETE FROM cached_categories", [])
            .map_err(|e| format!("فشل تنظيف الأقسام: {}", e))?;

        {
            let mut cat_stmt = tx
                .prepare("INSERT INTO cached_categories (id, name, color_code, icon, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)")
                .map_err(|e| format!("فشل تجهيز إضافة الأقسام: {}", e))?;
            for cat in categories {
                cat_stmt
                    .execute(params![cat.id, cat.name, cat.color_code, cat.icon, cat.sort_order])
                    .map_err(|e| format!("فشل حفظ القسم: {}", e))?;
            }
        }

        {
            let mut grp_stmt = tx
                .prepare("INSERT INTO cached_groups (id, category_id, name, sort_order) VALUES (?1, ?2, ?3, ?4)")
                .map_err(|e| format!("فشل تجهيز إضافة المجموعات: {}", e))?;
            for grp in groups {
                grp_stmt
                    .execute(params![grp.id, grp.category_id, grp.name, grp.sort_order])
                    .map_err(|e| format!("فشل حفظ المجموعة: {}", e))?;
            }
        }

        {
            let mut item_stmt = tx
                .prepare("INSERT INTO cached_items (id, group_id, type, name, base_price, sku, sort_order, internal_note) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
                .map_err(|e| format!("فشل تجهيز إضافة الخدمات والمنتجات: {}", e))?;
            for item in items {
                item_stmt
                    .execute(params![
                        item.id,
                        item.group_id,
                        item.r#type,
                        item.name,
                        item.base_price,
                        item.sku,
                        item.sort_order,
                        item.internal_note
                    ])
                    .map_err(|e| format!("فشل حفظ الخدمة/المنتج: {}", e))?;
            }
        }

        tx.execute(
            "INSERT OR REPLACE INTO sync_metadata (key, value, updated_at) VALUES ('CATALOG_VERSION', ?1, ?2)",
            params![version.to_string(), synced_at],
        )
        .map_err(|e| format!("فشل حفظ إصدار الكتالوج: {}", e))?;

        tx.execute(
            "INSERT OR REPLACE INTO sync_metadata (key, value, updated_at) VALUES ('CATALOG_LAST_SYNC', ?1, ?2)",
            params![synced_at, synced_at],
        )
        .map_err(|e| format!("فشل حفظ تاريخ المزامنة: {}", e))?;

        tx.commit()
            .map_err(|e| format!("فشل إتمام حفظ الكتالوج المشفر: {}", e))?;

        Ok(())
    }

    pub fn get_catalog(&self) -> Result<LocalCatalogData, String> {
        let conn = self.conn.lock().unwrap();

        let mut cat_stmt = conn
            .prepare("SELECT id, name, color_code, icon, sort_order FROM cached_categories ORDER BY sort_order ASC")
            .map_err(|e| format!("فشل قراءة الأقسام: {}", e))?;
        let cat_iter = cat_stmt
            .query_map([], |row| {
                Ok(LocalCategory {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color_code: row.get(2)?,
                    icon: row.get(3)?,
                    sort_order: row.get(4)?,
                })
            })
            .map_err(|e| format!("خطأ: {}", e))?;

        let mut categories = Vec::new();
        for cat in cat_iter {
            if let Ok(c) = cat {
                categories.push(c);
            }
        }

        let mut grp_stmt = conn
            .prepare("SELECT id, category_id, name, sort_order FROM cached_groups ORDER BY sort_order ASC")
            .map_err(|e| format!("فشل قراءة المجموعات: {}", e))?;
        let grp_iter = grp_stmt
            .query_map([], |row| {
                Ok(LocalGroup {
                    id: row.get(0)?,
                    category_id: row.get(1)?,
                    name: row.get(2)?,
                    sort_order: row.get(3)?,
                })
            })
            .map_err(|e| format!("خطأ: {}", e))?;

        let mut groups = Vec::new();
        for grp in grp_iter {
            if let Ok(g) = grp {
                groups.push(g);
            }
        }

        let mut item_stmt = conn
            .prepare("SELECT id, group_id, type, name, base_price, sku, sort_order, internal_note FROM cached_items ORDER BY sort_order ASC")
            .map_err(|e| format!("فشل قراءة الخدمات والمنتجات: {}", e))?;
        let item_iter = item_stmt
            .query_map([], |row| {
                Ok(LocalCatalogItem {
                    id: row.get(0)?,
                    group_id: row.get(1)?,
                    r#type: row.get(2)?,
                    name: row.get(3)?,
                    base_price: row.get(4)?,
                    sku: row.get(5)?,
                    sort_order: row.get(6)?,
                    internal_note: row.get(7)?,
                })
            })
            .map_err(|e| format!("خطأ: {}", e))?;

        let mut items = Vec::new();
        for it in item_iter {
            if let Ok(i) = it {
                items.push(i);
            }
        }

        let last_synced_at: Option<String> = conn
            .query_row(
                "SELECT value FROM sync_metadata WHERE key = 'CATALOG_LAST_SYNC'",
                [],
                |row| row.get(0),
            )
            .ok();

        let version: Option<i64> = conn
            .query_row(
                "SELECT value FROM sync_metadata WHERE key = 'CATALOG_VERSION'",
                [],
                |row| {
                    let val: String = row.get(0)?;
                    Ok(val.parse::<i64>().unwrap_or(0))
                },
            )
            .ok();

        Ok(LocalCatalogData {
            categories,
            groups,
            items,
            last_synced_at,
            version,
        })
    }

    // --- Employees ---
    pub fn replace_employees(&self, employees: &[LocalEmployee]) -> Result<(), String> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn
            .transaction()
            .map_err(|e| format!("فشل بدء المعاملة: {}", e))?;

        tx.execute("DELETE FROM cached_employees", [])
            .map_err(|e| format!("فشل تنظيف الحلاقين: {}", e))?;

        {
            let mut emp_stmt = tx
                .prepare("INSERT INTO cached_employees (id, name, role_title, sort_order) VALUES (?1, ?2, ?3, ?4)")
                .map_err(|e| format!("فشل تجهيز إضافة الحلاقين: {}", e))?;
            for emp in employees {
                emp_stmt
                    .execute(params![emp.id, emp.name, emp.role_title, emp.sort_order])
                    .map_err(|e| format!("فشل حفظ الحلاق: {}", e))?;
            }
        }

        tx.commit()
            .map_err(|e| format!("فشل حفظ الحلاقين: {}", e))?;
        Ok(())
    }

    pub fn get_employees(&self) -> Result<Vec<LocalEmployee>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare("SELECT id, name, role_title, sort_order FROM cached_employees ORDER BY sort_order ASC")
            .map_err(|e| format!("فشل قراءة الحلاقين: {}", e))?;

        let emp_iter = stmt
            .query_map([], |row| {
                Ok(LocalEmployee {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    role_title: row.get(2)?,
                    sort_order: row.get(3)?,
                })
            })
            .map_err(|e| format!("خطأ: {}", e))?;

        let mut employees = Vec::new();
        for emp in emp_iter {
            if let Ok(e) = emp {
                employees.push(e);
            }
        }
        Ok(employees)
    }

    // --- Audit Logging ---
    pub fn log_audit(
        &self,
        actor_user_id: Option<&str>,
        action: &str,
        entity_type: &str,
        entity_id: &str,
        before_data: Option<&str>,
        after_data: Option<&str>,
        reason: Option<&str>,
    ) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO local_audit_events (id, actor_user_id, action, entity_type, entity_id, before_data, after_data, reason, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![id, actor_user_id, action, entity_type, entity_id, before_data, after_data, reason, now],
        )
        .map_err(|e| format!("فشل تسجيل حدث التدقيق: {}", e))?;

        Ok(())
    }

    // --- Shift Management (Phase 6) ---
    pub fn open_shift(
        &self,
        cashier_user_id: &str,
        cashier_display_name: &str,
        opening_cash: f64,
    ) -> Result<LocalShift, String> {
        if opening_cash < 0.0 {
            return Err("كاش البداية لا يمكن أن يكون سالباً".to_string());
        }

        let conn = self.conn.lock().unwrap();

        // Check if cashier already has an active open shift
        let existing: Option<String> = conn
            .query_row(
                "SELECT local_id FROM local_shifts WHERE cashier_user_id = ?1 AND status IN ('OPEN', 'CLOSING') LIMIT 1",
                params![cashier_user_id],
                |row| row.get(0),
            )
            .ok();

        if let Some(existing_id) = existing {
            return Err(format!("توجد وردية مفتوحة بالفعل لهذا الكاشير (معرف الوردية: {})", existing_id));
        }

        let local_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO local_shifts (local_id, cashier_user_id, cashier_display_name_snapshot, status, opened_at, opening_cash_amount, expected_cash_amount, created_at, updated_at)
             VALUES (?1, ?2, ?3, 'OPEN', ?4, ?5, ?5, ?4, ?4)",
            params![local_id, cashier_user_id, cashier_display_name, now, opening_cash],
        )
        .map_err(|e| format!("فشل فتح الوردية: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_user_id),
            "OPEN_SHIFT",
            "SHIFT",
            &local_id,
            None,
            Some(&format!("{{\"opening_cash\": {}}}", opening_cash)),
            None,
        );

        Ok(LocalShift {
            local_id,
            cashier_user_id: cashier_user_id.to_string(),
            cashier_display_name_snapshot: cashier_display_name.to_string(),
            status: "OPEN".to_string(),
            opened_at: now.clone(),
            closed_at: None,
            opening_cash_amount: opening_cash,
            expected_cash_amount: opening_cash,
            actual_cash_amount: None,
            cash_difference_amount: None,
            closing_note: None,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn get_active_shift(&self, cashier_user_id: &str) -> Result<Option<LocalShift>, String> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT local_id, cashier_user_id, cashier_display_name_snapshot, status, opened_at, closed_at,
                        opening_cash_amount, expected_cash_amount, actual_cash_amount, cash_difference_amount,
                        closing_note, created_at, updated_at
                 FROM local_shifts
                 WHERE cashier_user_id = ?1 AND status IN ('OPEN', 'CLOSING')
                 ORDER BY created_at DESC LIMIT 1",
            )
            .map_err(|e| format!("فشل الاستعلام عن الوردية: {}", e))?;

        let mut rows = stmt
            .query(params![cashier_user_id])
            .map_err(|e| format!("خطأ في الاستعلام: {}", e))?;

        if let Some(row) = rows.next().map_err(|e| format!("خطأ: {}", e))? {
            let shift_id: String = row.get(0)?;
            let opening_cash: f64 = row.get(6)?;

            // Recompute dynamic expected cash
            let (cash_sales, cash_expenses) = Self::compute_shift_cash_movement(&conn, &shift_id)?;
            let current_expected = (opening_cash + cash_sales - cash_expenses).max(0.0);
            let current_expected_rounded = (current_expected * 100.0).round() / 100.0;

            Ok(Some(LocalShift {
                local_id: shift_id,
                cashier_user_id: row.get(1)?,
                cashier_display_name_snapshot: row.get(2)?,
                status: row.get(3)?,
                opened_at: row.get(4)?,
                closed_at: row.get(5)?,
                opening_cash_amount: opening_cash,
                expected_cash_amount: current_expected_rounded,
                actual_cash_amount: row.get(8)?,
                cash_difference_amount: row.get(9)?,
                closing_note: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            }))
        } else {
            Ok(None)
        }
    }

    fn compute_shift_cash_movement(conn: &Connection, shift_id: &str) -> Result<(f64, f64), String> {
        let cash_sales: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(p.amount), 0.0)
                 FROM local_payments p
                 JOIN local_invoices i ON p.invoice_local_id = i.local_id
                 WHERE i.shift_local_id = ?1 AND i.status = 'PAID' AND p.payment_method = 'CASH'",
                params![shift_id],
                |row| row.get(0),
            )
            .unwrap_or(0.0);

        let cash_expenses: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0.0)
                 FROM local_expenses
                 WHERE shift_local_id = ?1 AND status = 'RECORDED' AND payment_source = 'CASH_DRAWER'",
                params![shift_id],
                |row| row.get(0),
            )
            .unwrap_or(0.0);

        Ok((cash_sales, cash_expenses))
    }

    pub fn get_shift_summary(&self, shift_id: &str) -> Result<ShiftSummary, String> {
        let conn = self.conn.lock().unwrap();

        let opening_cash: f64 = conn
            .query_row(
                "SELECT opening_cash_amount FROM local_shifts WHERE local_id = ?1",
                params![shift_id],
                |row| row.get(0),
            )
            .map_err(|_| "الوردية غير موجودة".to_string())?;

        let (cash_sales, cash_expenses) = Self::compute_shift_cash_movement(&conn, shift_id)?;

        let non_cash_sales: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(p.amount), 0.0)
                 FROM local_payments p
                 JOIN local_invoices i ON p.invoice_local_id = i.local_id
                 WHERE i.shift_local_id = ?1 AND i.status = 'PAID' AND p.payment_method != 'CASH'",
                params![shift_id],
                |row| row.get(0),
            )
            .unwrap_or(0.0);

        let paid_invoices_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM local_invoices WHERE shift_local_id = ?1 AND status = 'PAID'",
                params![shift_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let total_sales = (cash_sales + non_cash_sales * 100.0).round() / 100.0;
        let expected_cash = ((opening_cash + cash_sales - cash_expenses) * 100.0).round() / 100.0;

        Ok(ShiftSummary {
            shift_id: shift_id.to_string(),
            opening_cash: (opening_cash * 100.0).round() / 100.0,
            cash_sales: (cash_sales * 100.0).round() / 100.0,
            non_cash_sales: (non_cash_sales * 100.0).round() / 100.0,
            total_sales,
            cash_expenses: (cash_expenses * 100.0).round() / 100.0,
            expected_cash,
            paid_invoices_count,
        })
    }

    pub fn close_shift(
        &self,
        shift_id: &str,
        actual_cash: f64,
        closing_note: Option<&str>,
        cashier_user_id: &str,
    ) -> Result<LocalShift, String> {
        if actual_cash < 0.0 {
            return Err("الكاش الفعلي لا يمكن أن يكون سالباً".to_string());
        }

        let conn = self.conn.lock().unwrap();

        // 1. Check for open draft/suspended invoices
        let open_invoices_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM local_invoices WHERE status IN ('DRAFT', 'SUSPENDED')",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if open_invoices_count > 0 {
            return Err(format!(
                "لا يمكن إغلاق الوردية قبل تسوية كافة الفواتير المفتوحة (يوجد {} فواتير مفتوحة/معلقة، يرجى إتمام الدفع أو إلغاؤها)",
                open_invoices_count
            ));
        }

        // 2. Fetch shift details & compute expected cash
        let (shift_status, opening_cash): (String, f64) = conn
            .query_row(
                "SELECT status, opening_cash_amount FROM local_shifts WHERE local_id = ?1",
                params![shift_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|_| "الوردية غير موجودة".to_string())?;

        if shift_status != "OPEN" && shift_status != "CLOSING" {
            return Err("الوردية مغلقة بالفعل".to_string());
        }

        let (cash_sales, cash_expenses) = Self::compute_shift_cash_movement(&conn, shift_id)?;
        let expected_cash = ((opening_cash + cash_sales - cash_expenses) * 100.0).round() / 100.0;
        let rounded_actual = (actual_cash * 100.0).round() / 100.0;
        let cash_diff = ((rounded_actual - expected_cash) * 100.0).round() / 100.0;

        // 3. If there is a cash difference, closing_note is MANDATORY
        if cash_diff.abs() > 0.001 {
            let note = closing_note.map(|n| n.trim()).unwrap_or("");
            if note.is_empty() {
                return Err("يجب إدخال سبب فرق الخزنة (عجز/زيادة) لإتمام إغلاق الوردية".to_string());
            }
        }

        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE local_shifts
             SET status = 'CLOSED_PENDING_SYNC', closed_at = ?1, expected_cash_amount = ?2,
                 actual_cash_amount = ?3, cash_difference_amount = ?4, closing_note = ?5, updated_at = ?6
             WHERE local_id = ?7",
            params![now, expected_cash, rounded_actual, cash_diff, closing_note, now, shift_id],
        )
        .map_err(|e| format!("فشل إغلاق الوردية: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_user_id),
            "CLOSE_SHIFT",
            "SHIFT",
            shift_id,
            None,
            Some(&format!(
                "{{\"expected\": {}, \"actual\": {}, \"diff\": {}}}",
                expected_cash, rounded_actual, cash_diff
            )),
            closing_note,
        );

        Ok(LocalShift {
            local_id: shift_id.to_string(),
            cashier_user_id: cashier_user_id.to_string(),
            cashier_display_name_snapshot: String::new(),
            status: "CLOSED_PENDING_SYNC".to_string(),
            opened_at: String::new(),
            closed_at: Some(now.clone()),
            opening_cash_amount: opening_cash,
            expected_cash_amount: expected_cash,
            actual_cash_amount: Some(rounded_actual),
            cash_difference_amount: Some(cash_diff),
            closing_note: closing_note.map(|s| s.to_string()),
            created_at: String::new(),
            updated_at: now,
        })
    }

    // --- Customers Management ---
    pub fn create_customer(
        &self,
        full_name: &str,
        phone_number: Option<&str>,
        birth_date: Option<&str>,
        internal_note: Option<&str>,
        cashier_id: &str,
    ) -> Result<LocalCustomer, String> {
        let trimmed_name = full_name.trim();
        if trimmed_name.is_empty() {
            return Err("اسم العميل مطلوب ولا يمكن تركه فارغاً".to_string());
        }

        let local_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let phone = phone_number.map(|p| p.trim().to_string()).filter(|p| !p.is_empty());
        let birth = birth_date.map(|b| b.trim().to_string()).filter(|b| !b.is_empty());
        let note = internal_note.map(|n| n.trim().to_string()).filter(|n| !n.is_empty());

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO local_customers (local_id, full_name, phone_number, birth_date, internal_note, created_at, updated_at, created_by_cashier_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![local_id, trimmed_name, phone, birth, note, now, now, cashier_id],
        )
        .map_err(|e| format!("فشل حفظ بيانات العميل: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_id),
            "CREATE_CUSTOMER",
            "CUSTOMER",
            &local_id,
            None,
            Some(&format!("{{\"name\": \"{}\"}}", trimmed_name)),
            None,
        );

        Ok(LocalCustomer {
            local_id,
            full_name: trimmed_name.to_string(),
            phone_number: phone,
            birth_date: birth,
            internal_note: note,
            created_at: now.clone(),
            updated_at: now,
            created_by_cashier_id: cashier_id.to_string(),
        })
    }

    pub fn search_customers(&self, query: &str) -> Result<Vec<LocalCustomer>, String> {
        let conn = self.conn.lock().unwrap();
        let q = format!("%{}%", query.trim());

        let mut stmt = conn
            .prepare(
                "SELECT local_id, full_name, phone_number, birth_date, internal_note, created_at, updated_at, created_by_cashier_id
                 FROM local_customers
                 WHERE full_name LIKE ?1 OR phone_number LIKE ?1
                 ORDER BY created_at DESC LIMIT 50",
            )
            .map_err(|e| format!("فشل الاستعلام عن العملاء: {}", e))?;

        let iter = stmt
            .query_map(params![q], |row| {
                Ok(LocalCustomer {
                    local_id: row.get(0)?,
                    full_name: row.get(1)?,
                    phone_number: row.get(2)?,
                    birth_date: row.get(3)?,
                    internal_note: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                    created_by_cashier_id: row.get(7)?,
                })
            })
            .map_err(|e| format!("خطأ: {}", e))?;

        let mut result = Vec::new();
        for c in iter {
            if let Ok(cust) = c {
                result.push(cust);
            }
        }
        Ok(result)
    }

    // --- Invoices & Open Tabs Management ---
    pub fn create_draft_invoice(&self, cashier_id: &str) -> Result<LocalInvoice, String> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn
            .transaction()
            .map_err(|e| format!("فشل بدء المعاملة: {}", e))?;

        let local_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let max_num: i64 = tx
            .query_row(
                "SELECT COALESCE(MAX(invoice_number_local), 0) FROM local_invoices",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let next_number = max_num + 1;

        tx.execute(
            "INSERT INTO local_invoices (local_id, invoice_number_local, status, cashier_user_id, subtotal, total_discount, total_surcharge, total, created_at, updated_at)
             VALUES (?1, ?2, 'DRAFT', ?3, 0, 0, 0, 0, ?4, ?5)",
            params![local_id, next_number, cashier_id, now, now],
        )
        .map_err(|e| format!("فشل إنشاء الفاتورة المحلية: {}", e))?;

        tx.commit()
            .map_err(|e| format!("فشل إتمام المعاملة: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_id),
            "CREATE_INVOICE",
            "INVOICE",
            &local_id,
            None,
            Some(&format!("{{\"invoice_number\": {}}}", next_number)),
            None,
        );

        Ok(LocalInvoice {
            local_id,
            invoice_number_local: next_number,
            status: "DRAFT".to_string(),
            customer_local_id: None,
            customer: None,
            cashier_user_id: cashier_id.to_string(),
            shift_local_id: None,
            subtotal: 0.0,
            total_discount: 0.0,
            total_surcharge: 0.0,
            total: 0.0,
            internal_note: None,
            paid_at: None,
            created_at: now.clone(),
            updated_at: now,
            lines: Vec::new(),
            payments: Vec::new(),
        })
    }

    pub fn get_open_invoices(&self) -> Result<Vec<LocalInvoice>, String> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT i.local_id, i.invoice_number_local, i.status, i.customer_local_id, i.cashier_user_id,
                        i.shift_local_id, i.subtotal, i.total_discount, i.total_surcharge, i.total, i.internal_note,
                        i.paid_at, i.created_at, i.updated_at,
                        c.full_name, c.phone_number
                 FROM local_invoices i
                 LEFT JOIN local_customers c ON i.customer_local_id = c.local_id
                 WHERE i.status IN ('DRAFT', 'SUSPENDED')
                 ORDER BY i.invoice_number_local ASC",
            )
            .map_err(|e| format!("فشل الاستعلام عن الفواتير: {}", e))?;

        let invoice_rows = stmt
            .query_map([], |row| {
                let cust_id: Option<String> = row.get(3)?;
                let cust_name: Option<String> = row.get(14)?;
                let cust_phone: Option<String> = row.get(15)?;

                let customer = if let (Some(cid), Some(cname)) = (cust_id.clone(), cust_name) {
                    Some(LocalCustomer {
                        local_id: cid,
                        full_name: cname,
                        phone_number: cust_phone,
                        birth_date: None,
                        internal_note: None,
                        created_at: String::new(),
                        updated_at: String::new(),
                        created_by_cashier_id: String::new(),
                    })
                } else {
                    None
                };

                Ok(LocalInvoice {
                    local_id: row.get(0)?,
                    invoice_number_local: row.get(1)?,
                    status: row.get(2)?,
                    customer_local_id: cust_id,
                    customer,
                    cashier_user_id: row.get(4)?,
                    shift_local_id: row.get(5)?,
                    subtotal: row.get(6)?,
                    total_discount: row.get(7)?,
                    total_surcharge: row.get(8)?,
                    total: row.get(9)?,
                    internal_note: row.get(10)?,
                    paid_at: row.get(11)?,
                    created_at: row.get(12)?,
                    updated_at: row.get(13)?,
                    lines: Vec::new(),
                    payments: Vec::new(),
                })
            })
            .map_err(|e| format!("خطأ في قراءة الفواتير: {}", e))?;

        let mut invoices = Vec::new();
        for inv in invoice_rows {
            if let Ok(mut invoice) = inv {
                invoice.lines = self.get_lines_for_invoice_internal(&conn, &invoice.local_id)?;
                invoice.payments = self.get_payments_for_invoice_internal(&conn, &invoice.local_id)?;
                invoices.push(invoice);
            }
        }

        Ok(invoices)
    }

    pub fn get_active_shift_paid_invoices(&self, shift_id: &str) -> Result<Vec<LocalInvoice>, String> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT i.local_id, i.invoice_number_local, i.status, i.customer_local_id, i.cashier_user_id,
                        i.shift_local_id, i.subtotal, i.total_discount, i.total_surcharge, i.total, i.internal_note,
                        i.paid_at, i.created_at, i.updated_at,
                        c.full_name, c.phone_number
                 FROM local_invoices i
                 LEFT JOIN local_customers c ON i.customer_local_id = c.local_id
                 WHERE i.shift_local_id = ?1 AND i.status = 'PAID'
                 ORDER BY i.paid_at DESC",
            )
            .map_err(|e| format!("فشل الاستعلام عن الفواتير المدفوعة: {}", e))?;

        let invoice_rows = stmt
            .query_map(params![shift_id], |row| {
                let cust_id: Option<String> = row.get(3)?;
                let cust_name: Option<String> = row.get(14)?;
                let cust_phone: Option<String> = row.get(15)?;

                let customer = if let (Some(cid), Some(cname)) = (cust_id.clone(), cust_name) {
                    Some(LocalCustomer {
                        local_id: cid,
                        full_name: cname,
                        phone_number: cust_phone,
                        birth_date: None,
                        internal_note: None,
                        created_at: String::new(),
                        updated_at: String::new(),
                        created_by_cashier_id: String::new(),
                    })
                } else {
                    None
                };

                Ok(LocalInvoice {
                    local_id: row.get(0)?,
                    invoice_number_local: row.get(1)?,
                    status: row.get(2)?,
                    customer_local_id: cust_id,
                    customer,
                    cashier_user_id: row.get(4)?,
                    shift_local_id: row.get(5)?,
                    subtotal: row.get(6)?,
                    total_discount: row.get(7)?,
                    total_surcharge: row.get(8)?,
                    total: row.get(9)?,
                    internal_note: row.get(10)?,
                    paid_at: row.get(11)?,
                    created_at: row.get(12)?,
                    updated_at: row.get(13)?,
                    lines: Vec::new(),
                    payments: Vec::new(),
                })
            })
            .map_err(|e| format!("خطأ: {}", e))?;

        let mut invoices = Vec::new();
        for inv in invoice_rows {
            if let Ok(mut invoice) = inv {
                invoice.lines = self.get_lines_for_invoice_internal(&conn, &invoice.local_id)?;
                invoice.payments = self.get_payments_for_invoice_internal(&conn, &invoice.local_id)?;
                invoices.push(invoice);
            }
        }

        Ok(invoices)
    }

    fn get_lines_for_invoice_internal(
        &self,
        conn: &Connection,
        invoice_id: &str,
    ) -> Result<Vec<LocalInvoiceLine>, String> {
        let mut line_stmt = conn
            .prepare(
                "SELECT local_id, invoice_local_id, catalog_item_id, item_type, item_name_snapshot,
                        original_unit_price_snapshot, quantity, assigned_employee_id, assigned_employee_name_snapshot,
                        internal_note, line_subtotal, line_final_total, created_at, updated_at
                 FROM local_invoice_lines
                 WHERE invoice_local_id = ?1
                 ORDER BY created_at ASC",
            )
            .map_err(|e| format!("فشل الاستعلام عن سطور الفاتورة: {}", e))?;

        let line_iter = line_stmt
            .query_map(params![invoice_id], |row| {
                Ok(LocalInvoiceLine {
                    local_id: row.get(0)?,
                    invoice_local_id: row.get(1)?,
                    catalog_item_id: row.get(2)?,
                    item_type: row.get(3)?,
                    item_name_snapshot: row.get(4)?,
                    original_unit_price_snapshot: row.get(5)?,
                    quantity: row.get(6)?,
                    assigned_employee_id: row.get(7)?,
                    assigned_employee_name_snapshot: row.get(8)?,
                    internal_note: row.get(9)?,
                    line_subtotal: row.get(10)?,
                    line_final_total: row.get(11)?,
                    created_at: row.get(12)?,
                    updated_at: row.get(13)?,
                    active_adjustment: None,
                })
            })
            .map_err(|e| format!("خطأ: {}", e))?;

        let mut lines = Vec::new();
        for l in line_iter {
            if let Ok(mut line) = l {
                line.active_adjustment = self.get_adjustment_for_line_internal(conn, &line.local_id)?;
                lines.push(line);
            }
        }
        Ok(lines)
    }

    fn get_payments_for_invoice_internal(
        &self,
        conn: &Connection,
        invoice_id: &str,
    ) -> Result<Vec<LocalPayment>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT local_id, invoice_local_id, payment_method, amount, cash_received_amount, change_amount, reference_note, created_at, created_by_cashier_id
                 FROM local_payments
                 WHERE invoice_local_id = ?1
                 ORDER BY created_at ASC",
            )
            .map_err(|e| format!("فشل الاستعلام عن المدفوعات: {}", e))?;

        let iter = stmt
            .query_map(params![invoice_id], |row| {
                Ok(LocalPayment {
                    local_id: row.get(0)?,
                    invoice_local_id: row.get(1)?,
                    payment_method: row.get(2)?,
                    amount: row.get(3)?,
                    cash_received_amount: row.get(4)?,
                    change_amount: row.get(5)?,
                    reference_note: row.get(6)?,
                    created_at: row.get(7)?,
                    created_by_cashier_id: row.get(8)?,
                })
            })
            .map_err(|e| format!("خطأ: {}", e))?;

        let mut payments = Vec::new();
        for p in iter {
            if let Ok(pay) = p {
                payments.push(pay);
            }
        }
        Ok(payments)
    }

    fn get_adjustment_for_line_internal(
        &self,
        conn: &Connection,
        line_id: &str,
    ) -> Result<Option<LocalLineAdjustment>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT local_id, invoice_line_local_id, adjustment_type, original_price_before,
                        resulting_price_after, input_value, reason, performed_by_cashier_id, created_at
                 FROM local_line_adjustments
                 WHERE invoice_line_local_id = ?1
                 ORDER BY created_at DESC LIMIT 1",
            )
            .map_err(|e| format!("فشل قراءة التعديل: {}", e))?;

        let mut rows = stmt
            .query(params![line_id])
            .map_err(|e| format!("خطأ: {}", e))?;

        if let Some(row) = rows.next().map_err(|e| format!("خطأ: {}", e))? {
            Ok(Some(LocalLineAdjustment {
                local_id: row.get(0)?,
                invoice_line_local_id: row.get(1)?,
                adjustment_type: row.get(2)?,
                original_price_before: row.get(3)?,
                resulting_price_after: row.get(4)?,
                input_value: row.get(5)?,
                reason: row.get(6)?,
                performed_by_cashier_id: row.get(7)?,
                created_at: row.get(8)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn set_invoice_customer(
        &self,
        invoice_id: &str,
        customer_id: Option<&str>,
        cashier_id: &str,
    ) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();

        let status: String = conn
            .query_row(
                "SELECT status FROM local_invoices WHERE local_id = ?1",
                params![invoice_id],
                |row| row.get(0),
            )
            .map_err(|_| "الفاتورة غير موجودة".to_string())?;

        if status == "PAID" {
            return Err("لا يمكن تعديل عميل فاتورة بعد إتمام الدفع".to_string());
        }

        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE local_invoices SET customer_local_id = ?1, updated_at = ?2 WHERE local_id = ?3",
            params![customer_id, now, invoice_id],
        )
        .map_err(|e| format!("فشل ربط العميل بالفاتورة: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_id),
            "SET_INVOICE_CUSTOMER",
            "INVOICE",
            invoice_id,
            None,
            Some(&format!("{{\"customer_id\": \"{:?}\"}}", customer_id)),
            None,
        );

        Ok(())
    }

    // --- Line Items Operations ---
    pub fn add_item_to_invoice(
        &self,
        invoice_id: &str,
        catalog_item_id: &str,
        cashier_id: &str,
    ) -> Result<LocalInvoice, String> {
        let mut conn = self.conn.lock().unwrap();

        let invoice_status: String = conn
            .query_row(
                "SELECT status FROM local_invoices WHERE local_id = ?1",
                params![invoice_id],
                |row| row.get(0),
            )
            .map_err(|_| "الفاتورة غير موجودة".to_string())?;

        if invoice_status == "PAID" {
            return Err("لا يمكن إضافة عناصر لفاتورة مدفوعة بالفعل".to_string());
        }

        // Fetch item from cached catalog
        let item: (String, String, String, f64) = conn
            .query_row(
                "SELECT id, type, name, base_price FROM cached_items WHERE id = ?1",
                params![catalog_item_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .map_err(|_| "العنصر غير موجود في الكتالوج المحلي".to_string())?;

        let (item_id, item_type, item_name, base_price) = item;
        let now = chrono::Utc::now().to_rfc3339();

        let tx = conn
            .transaction()
            .map_err(|e| format!("فشل بدء المعاملة: {}", e))?;

        if item_type == "PRODUCT" {
            // For products, check if product line already exists without adjustments
            let existing_line: Option<(String, i32)> = tx
                .query_row(
                    "SELECT local_id, quantity FROM local_invoice_lines WHERE invoice_local_id = ?1 AND catalog_item_id = ?2 LIMIT 1",
                    params![invoice_id, item_id],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
                .ok();

            if let Some((line_id, qty)) = existing_line {
                let new_qty = qty + 1;
                let new_subtotal = base_price * (new_qty as f64);
                let new_final = new_subtotal;

                tx.execute(
                    "UPDATE local_invoice_lines SET quantity = ?1, line_subtotal = ?2, line_final_total = ?3, updated_at = ?4 WHERE local_id = ?5",
                    params![new_qty, new_subtotal, new_final, now, line_id],
                )
                .map_err(|e| format!("فشل زيادة كمية المنتج: {}", e))?;
            } else {
                let line_id = uuid::Uuid::new_v4().to_string();
                tx.execute(
                    "INSERT INTO local_invoice_lines (local_id, invoice_local_id, catalog_item_id, item_type, item_name_snapshot, original_unit_price_snapshot, quantity, line_subtotal, line_final_total, created_at, updated_at)
                     VALUES (?1, ?2, ?3, 'PRODUCT', ?4, ?5, 1, ?5, ?5, ?6, ?6)",
                    params![line_id, invoice_id, item_id, item_name, base_price, now],
                )
                .map_err(|e| format!("فشل إضافة منتج للفاتورة: {}", e))?;
            }
        } else {
            // Services ALWAYS add an independent new line
            let line_id = uuid::Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO local_invoice_lines (local_id, invoice_local_id, catalog_item_id, item_type, item_name_snapshot, original_unit_price_snapshot, quantity, line_subtotal, line_final_total, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 'SERVICE', ?4, ?5, 1, ?5, ?5, ?6, ?6)",
                params![line_id, invoice_id, item_id, item_name, base_price, now],
            )
            .map_err(|e| format!("فشل إضافة خدمة للفاتورة: {}", e))?;
        }

        Self::recalculate_invoice_totals_tx(&tx, invoice_id)?;

        tx.commit()
            .map_err(|e| format!("فشل إتمام المعاملة: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_id),
            "ADD_INVOICE_LINE",
            "INVOICE_LINE",
            catalog_item_id,
            None,
            Some(&format!("{{\"name\": \"{}\", \"price\": {}}}", item_name, base_price)),
            None,
        );

        self.get_invoice_by_id_internal(invoice_id)
    }

    pub fn update_line_quantity(
        &self,
        line_id: &str,
        new_quantity: i32,
        cashier_id: &str,
    ) -> Result<LocalInvoice, String> {
        if new_quantity <= 0 {
            return Err("الكمية يجب أن تكون 1 أو أكثر".to_string());
        }

        let mut conn = self.conn.lock().unwrap();
        let (invoice_id, base_price, _item_type): (String, f64, String) = conn
            .query_row(
                "SELECT invoice_local_id, original_unit_price_snapshot, item_type FROM local_invoice_lines WHERE local_id = ?1",
                params![line_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|_| "سطر الفاتورة غير موجود".to_string())?;

        let invoice_status: String = conn
            .query_row(
                "SELECT status FROM local_invoices WHERE local_id = ?1",
                params![invoice_id],
                |row| row.get(0),
            )
            .map_err(|_| "الفاتورة غير موجودة".to_string())?;

        if invoice_status == "PAID" {
            return Err("لا يمكن تعديل كميات فاتورة مدفوعة".to_string());
        }

        let now = chrono::Utc::now().to_rfc3339();
        let new_subtotal = base_price * (new_quantity as f64);

        let tx = conn
            .transaction()
            .map_err(|e| format!("فشل بدء المعاملة: {}", e))?;

        // Check if there is an active adjustment
        let adj: Option<(String, f64)> = tx
            .query_row(
                "SELECT adjustment_type, input_value FROM local_line_adjustments WHERE invoice_line_local_id = ?1 ORDER BY created_at DESC LIMIT 1",
                params![line_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .ok();

        let final_total = if let Some((adj_type, val)) = adj {
            Self::calculate_adjusted_line_total(new_subtotal, base_price, new_quantity, &adj_type, val)?
        } else {
            new_subtotal
        };

        tx.execute(
            "UPDATE local_invoice_lines SET quantity = ?1, line_subtotal = ?2, line_final_total = ?3, updated_at = ?4 WHERE local_id = ?5",
            params![new_quantity, new_subtotal, final_total, now, line_id],
        )
        .map_err(|e| format!("فشل تحديث كمية السطر: {}", e))?;

        Self::recalculate_invoice_totals_tx(&tx, &invoice_id)?;

        tx.commit()
            .map_err(|e| format!("فشل حفظ الكمية: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_id),
            "UPDATE_LINE_QUANTITY",
            "INVOICE_LINE",
            line_id,
            None,
            Some(&format!("{{\"quantity\": {}}}", new_quantity)),
            None,
        );

        self.get_invoice_by_id_internal(&invoice_id)
    }

    pub fn remove_invoice_line(
        &self,
        line_id: &str,
        cashier_id: &str,
    ) -> Result<LocalInvoice, String> {
        let mut conn = self.conn.lock().unwrap();
        let invoice_id: String = conn
            .query_row(
                "SELECT invoice_local_id FROM local_invoice_lines WHERE local_id = ?1",
                params![line_id],
                |row| row.get(0),
            )
            .map_err(|_| "سطر الفاتورة غير موجود".to_string())?;

        let invoice_status: String = conn
            .query_row(
                "SELECT status FROM local_invoices WHERE local_id = ?1",
                params![invoice_id],
                |row| row.get(0),
            )
            .map_err(|_| "الفاتورة غير موجودة".to_string())?;

        if invoice_status == "PAID" {
            return Err("لا يمكن حذف سطر من فاتورة مدفوعة".to_string());
        }

        let tx = conn
            .transaction()
            .map_err(|e| format!("فشل بدء المعاملة: {}", e))?;

        tx.execute("DELETE FROM local_invoice_lines WHERE local_id = ?1", params![line_id])
            .map_err(|e| format!("فشل حذف السطر: {}", e))?;

        Self::recalculate_invoice_totals_tx(&tx, &invoice_id)?;

        tx.commit()
            .map_err(|e| format!("فشل إتمام حذف السطر: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_id),
            "REMOVE_INVOICE_LINE",
            "INVOICE_LINE",
            line_id,
            None,
            None,
            None,
        );

        self.get_invoice_by_id_internal(&invoice_id)
    }

    pub fn assign_barber_to_line(
        &self,
        line_id: &str,
        employee_id: Option<&str>,
        cashier_id: &str,
    ) -> Result<LocalInvoice, String> {
        let conn = self.conn.lock().unwrap();
        let (invoice_id, item_type): (String, String) = conn
            .query_row(
                "SELECT invoice_local_id, item_type FROM local_invoice_lines WHERE local_id = ?1",
                params![line_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|_| "سطر الفاتورة غير موجود".to_string())?;

        let invoice_status: String = conn
            .query_row(
                "SELECT status FROM local_invoices WHERE local_id = ?1",
                params![invoice_id],
                |row| row.get(0),
            )
            .map_err(|_| "الفاتورة غير موجودة".to_string())?;

        if invoice_status == "PAID" {
            return Err("لا يمكن تغيير حلاق الخدمة بعد إتمام الدفع".to_string());
        }

        if item_type != "SERVICE" {
            return Err("لا يمكن تعيين حلاق لمنتج بيع، الحلاق يُعين للخدمات فقط".to_string());
        }

        let emp_name: Option<String> = if let Some(eid) = employee_id {
            conn.query_row(
                "SELECT name FROM cached_employees WHERE id = ?1",
                params![eid],
                |row| row.get(0),
            )
            .ok()
        } else {
            None
        };

        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE local_invoice_lines SET assigned_employee_id = ?1, assigned_employee_name_snapshot = ?2, updated_at = ?3 WHERE local_id = ?4",
            params![employee_id, emp_name, now, line_id],
        )
        .map_err(|e| format!("فشل تعيين الحلاق للخدمة: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_id),
            "ASSIGN_BARBER",
            "INVOICE_LINE",
            line_id,
            None,
            Some(&format!("{{\"barber_name\": \"{:?}\"}}", emp_name)),
            None,
        );

        self.get_invoice_by_id_internal(&invoice_id)
    }

    // --- Price Adjustments Calculation Engine ---
    pub fn apply_line_adjustment(
        &self,
        line_id: &str,
        adjustment_type: &str,
        input_value: f64,
        reason: Option<&str>,
        cashier_id: &str,
    ) -> Result<LocalInvoice, String> {
        let mut conn = self.conn.lock().unwrap();

        let (invoice_id, original_unit_price, quantity): (String, f64, i32) = conn
            .query_row(
                "SELECT invoice_local_id, original_unit_price_snapshot, quantity FROM local_invoice_lines WHERE local_id = ?1",
                params![line_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|_| "سطر الفاتورة غير موجود".to_string())?;

        let invoice_status: String = conn
            .query_row(
                "SELECT status FROM local_invoices WHERE local_id = ?1",
                params![invoice_id],
                |row| row.get(0),
            )
            .map_err(|_| "الفاتورة غير موجودة".to_string())?;

        if invoice_status == "PAID" {
            return Err("لا يمكن تعديل أسعار أو خصومات فاتورة مدفوعة".to_string());
        }

        let line_subtotal = original_unit_price * (quantity as f64);
        let final_line_total = Self::calculate_adjusted_line_total(
            line_subtotal,
            original_unit_price,
            quantity,
            adjustment_type,
            input_value,
        )?;

        let now = chrono::Utc::now().to_rfc3339();
        let adj_id = uuid::Uuid::new_v4().to_string();

        let tx = conn
            .transaction()
            .map_err(|e| format!("فشل بدء المعاملة: {}", e))?;

        // 1. Delete previous adjustments for this line
        tx.execute(
            "DELETE FROM local_line_adjustments WHERE invoice_line_local_id = ?1",
            params![line_id],
        )
        .map_err(|e| format!("فشل تحديث التعديلات السابقة: {}", e))?;

        // 2. Insert new adjustment record
        tx.execute(
            "INSERT INTO local_line_adjustments (local_id, invoice_line_local_id, adjustment_type, original_price_before, resulting_price_after, input_value, reason, performed_by_cashier_id, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![adj_id, line_id, adjustment_type, line_subtotal, final_line_total, input_value, reason, cashier_id, now],
        )
        .map_err(|e| format!("فشل تسجيل التعديل: {}", e))?;

        // 3. Update line final total
        tx.execute(
            "UPDATE local_invoice_lines SET line_final_total = ?1, updated_at = ?2 WHERE local_id = ?3",
            params![final_line_total, now, line_id],
        )
        .map_err(|e| format!("فشل تحديث إجمالي السطر: {}", e))?;

        // 4. Recalculate invoice totals
        Self::recalculate_invoice_totals_tx(&tx, &invoice_id)?;

        tx.commit()
            .map_err(|e| format!("فشل إتمام حفظ تعديل السعر: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_id),
            "APPLY_PRICE_ADJUSTMENT",
            "INVOICE_LINE",
            line_id,
            Some(&format!("{{\"before\": {}}}", line_subtotal)),
            Some(&format!("{{\"after\": {}, \"type\": \"{}\", \"input\": {}}}", final_line_total, adjustment_type, input_value)),
            reason,
        );

        self.get_invoice_by_id_internal(&invoice_id)
    }

    fn calculate_adjusted_line_total(
        line_subtotal: f64,
        _original_unit_price: f64,
        quantity: i32,
        adj_type: &str,
        input_value: f64,
    ) -> Result<f64, String> {
        match adj_type {
            "MANUAL_PRICE_OVERRIDE" => {
                if input_value < 0.0 {
                    return Err("لا يمكن تحديد سعر سالب".to_string());
                }
                let total = input_value * (quantity as f64);
                Ok((total * 100.0).round() / 100.0)
            }
            "FIXED_DISCOUNT" => {
                if input_value < 0.0 {
                    return Err("قيمة الخصم لا يمكن أن تكون سالبة".to_string());
                }
                if input_value > line_subtotal {
                    return Err("قيمة الخصم لا يمكن أن تتجاوز إجمالي السعر".to_string());
                }
                let total = (line_subtotal - input_value).max(0.0);
                Ok((total * 100.0).round() / 100.0)
            }
            "PERCENTAGE_DISCOUNT" => {
                if input_value < 0.0 || input_value > 100.0 {
                    return Err("نسبة الخصم يجب أن تكون بين 0% و 100%".to_string());
                }
                let discount_amount = (line_subtotal * input_value) / 100.0;
                let total = (line_subtotal - discount_amount).max(0.0);
                Ok((total * 100.0).round() / 100.0)
            }
            "FIXED_SURCHARGE" => {
                if input_value < 0.0 {
                    return Err("قيمة الزيادة لا يمكن أن تكون سالبة".to_string());
                }
                let total = line_subtotal + input_value;
                Ok((total * 100.0).round() / 100.0)
            }
            "PERCENTAGE_SURCHARGE" => {
                if input_value < 0.0 {
                    return Err("نسبة الزيادة لا يمكن أن تكون سالبة".to_string());
                }
                let surcharge_amount = (line_subtotal * input_value) / 100.0;
                let total = line_subtotal + surcharge_amount;
                Ok((total * 100.0).round() / 100.0)
            }
            _ => Err("نوع التعديل غير صالح".to_string()),
        }
    }

    fn recalculate_invoice_totals_tx(
        tx: &rusqlite::Transaction,
        invoice_id: &str,
    ) -> Result<(), String> {
        let mut stmt = tx
            .prepare(
                "SELECT line_subtotal, line_final_total FROM local_invoice_lines WHERE invoice_local_id = ?1",
            )
            .map_err(|e| format!("خطأ: {}", e))?;

        let rows = stmt
            .query_map(params![invoice_id], |row| {
                Ok((row.get::<_, f64>(0)?, row.get::<_, f64>(1)?))
            })
            .map_err(|e| format!("خطأ: {}", e))?;

        let mut subtotal = 0.0;
        let mut total_discount = 0.0;
        let mut total_surcharge = 0.0;
        let mut final_total = 0.0;

        for r in rows {
            if let Ok((line_sub, line_fin)) = r {
                subtotal += line_sub;
                final_total += line_fin;

                if line_fin < line_sub {
                    total_discount += line_sub - line_fin;
                } else if line_fin > line_sub {
                    total_surcharge += line_fin - line_sub;
                }
            }
        }

        let now = chrono::Utc::now().to_rfc3339();
        tx.execute(
            "UPDATE local_invoices SET subtotal = ?1, total_discount = ?2, total_surcharge = ?3, total = ?4, updated_at = ?5 WHERE local_id = ?6",
            params![
                (subtotal * 100.0).round() / 100.0,
                (total_discount * 100.0).round() / 100.0,
                (total_surcharge * 100.0).round() / 100.0,
                (final_total * 100.0).round() / 100.0,
                now,
                invoice_id
            ],
        )
        .map_err(|e| format!("فشل تحديث إجماليات الفاتورة: {}", e))?;

        Ok(())
    }

    // --- Payment Processing Engine (Phase 6) ---
    pub fn process_invoice_payment(
        &self,
        invoice_id: &str,
        shift_id: &str,
        payments: &[LocalPaymentInput],
        cashier_user_id: &str,
    ) -> Result<LocalInvoice, String> {
        if payments.is_empty() {
            return Err("يجب إضافة طريقة دفع واحدة على الأقل".to_string());
        }

        let mut conn = self.conn.lock().unwrap();

        // 1. Check active shift status
        let shift_status: String = conn
            .query_row(
                "SELECT status FROM local_shifts WHERE local_id = ?1",
                params![shift_id],
                |row| row.get(0),
            )
            .map_err(|_| "الوردية غير موجودة أو تم إغلاقها".to_string())?;

        if shift_status != "OPEN" {
            return Err("لا يمكن إتمام الدفع بدون وجود وردية مفتوحة".to_string());
        }

        // 2. Fetch invoice and ensure it is DRAFT or SUSPENDED
        let (status, total): (String, f64) = conn
            .query_row(
                "SELECT status, total FROM local_invoices WHERE local_id = ?1",
                params![invoice_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|_| "الفاتورة غير موجودة".to_string())?;

        if status == "PAID" {
            return Err("الفاتورة مدفوعة بالفعل".to_string());
        }
        if status == "CANCELLED" {
            return Err("لا يمكن سداد فاتورة ملغاة".to_string());
        }

        // 3. Ensure invoice has lines
        let lines_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM local_invoice_lines WHERE invoice_local_id = ?1",
                params![invoice_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if lines_count == 0 {
            return Err("لا يمكن إتمام الدفع لفاتورة فارغة".to_string());
        }

        // 4. Validate payment lines & totals sum
        let mut total_paid_input = 0.0;
        for p in payments {
            if p.amount <= 0.0 {
                return Err("مبلغ الدفع يجب أن يكون أكبر من الصفر".to_string());
            }
            total_paid_input += p.amount;
        }

        let rounded_total = (total * 100.0).round() / 100.0;
        let rounded_paid = (total_paid_input * 100.0).round() / 100.0;

        if (rounded_paid - rounded_total).abs() > 0.01 {
            return Err(format!(
                "مجموع المدفوعات ({:.2} ج.م) يجب أن يتطابق تماماً مع إجمالي الفاتورة ({:.2} ج.م)",
                rounded_paid, rounded_total
            ));
        }

        let now = chrono::Utc::now().to_rfc3339();
        let tx = conn
            .transaction()
            .map_err(|e| format!("فشل بدء المعاملة: {}", e))?;

        // 5. Update invoice to PAID with shift link and paid timestamp
        tx.execute(
            "UPDATE local_invoices SET status = 'PAID', shift_local_id = ?1, paid_at = ?2, updated_at = ?2 WHERE local_id = ?3",
            params![shift_id, now, invoice_id],
        )
        .map_err(|e| format!("فشل تحديث حالة الفاتورة إلى مدفوعة: {}", e))?;

        // 6. Insert payment records
        {
            let mut pay_stmt = tx
                .prepare(
                    "INSERT INTO local_payments (local_id, invoice_local_id, payment_method, amount, cash_received_amount, change_amount, reference_note, created_at, created_by_cashier_id)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                )
                .map_err(|e| format!("فشل تجهيز حفظ المدفوعات: {}", e))?;

            for p in payments {
                let pay_id = uuid::Uuid::new_v4().to_string();
                let change = if p.payment_method == "CASH" {
                    p.cash_received_amount.map(|rcv| (rcv - p.amount).max(0.0))
                } else {
                    None
                };

                pay_stmt
                    .execute(params![
                        pay_id,
                        invoice_id,
                        p.payment_method,
                        (p.amount * 100.0).round() / 100.0,
                        p.cash_received_amount,
                        change,
                        p.reference_note,
                        now,
                        cashier_user_id
                    ])
                    .map_err(|e| format!("فشل تسجيل عملية الدفع: {}", e))?;
            }
        }

        tx.commit()
            .map_err(|e| format!("فشل إتمام معاملة الدفع: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_user_id),
            "PROCESS_PAYMENT",
            "INVOICE",
            invoice_id,
            None,
            Some(&format!("{{\"total\": {}, \"shift_id\": \"{}\"}}", rounded_total, shift_id)),
            None,
        );

        self.get_invoice_by_id_internal(invoice_id)
    }

    // --- Expenses Management (Phase 6) ---
    pub fn record_expense(
        &self,
        shift_id: &str,
        amount: f64,
        category: &str,
        note: Option<&str>,
        cashier_user_id: &str,
    ) -> Result<LocalExpense, String> {
        if amount <= 0.0 {
            return Err("مبلغ المصروف يجب أن يكون أكبر من الصفر".to_string());
        }
        let cat = category.trim();
        if cat.is_empty() {
            return Err("تصنيف المصروف إلزامي".to_string());
        }

        let conn = self.conn.lock().unwrap();

        // Check active shift status
        let shift_status: String = conn
            .query_row(
                "SELECT status FROM local_shifts WHERE local_id = ?1",
                params![shift_id],
                |row| row.get(0),
            )
            .map_err(|_| "الوردية غير موجودة".to_string())?;

        if shift_status != "OPEN" {
            return Err("لا يمكن تسجيل مصروفات بعد إغلاق الوردية".to_string());
        }

        let local_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let rounded_amount = (amount * 100.0).round() / 100.0;

        conn.execute(
            "INSERT INTO local_expenses (local_id, shift_local_id, amount, category, internal_note, payment_source, status, created_at, created_by_cashier_id)
             VALUES (?1, ?2, ?3, ?4, ?5, 'CASH_DRAWER', 'RECORDED', ?6, ?7)",
            params![local_id, shift_id, rounded_amount, cat, note, now, cashier_user_id],
        )
        .map_err(|e| format!("فشل تسجيل المصروف: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_user_id),
            "RECORD_EXPENSE",
            "EXPENSE",
            &local_id,
            None,
            Some(&format!("{{\"amount\": {}, \"category\": \"{}\"}}", rounded_amount, cat)),
            note,
        );

        Ok(LocalExpense {
            local_id,
            shift_local_id: shift_id.to_string(),
            amount: rounded_amount,
            category: cat.to_string(),
            internal_note: note.map(|n| n.to_string()),
            attachment_local_path: None,
            payment_source: "CASH_DRAWER".to_string(),
            status: "RECORDED".to_string(),
            created_at: now,
            created_by_cashier_id: cashier_user_id.to_string(),
        })
    }

    pub fn get_active_shift_expenses(&self, shift_id: &str) -> Result<Vec<LocalExpense>, String> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT local_id, shift_local_id, amount, category, internal_note, attachment_local_path, payment_source, status, created_at, created_by_cashier_id
                 FROM local_expenses
                 WHERE shift_local_id = ?1 AND status = 'RECORDED'
                 ORDER BY created_at DESC",
            )
            .map_err(|e| format!("فشل قراءة المصروفات: {}", e))?;

        let iter = stmt
            .query_map(params![shift_id], |row| {
                Ok(LocalExpense {
                    local_id: row.get(0)?,
                    shift_local_id: row.get(1)?,
                    amount: row.get(2)?,
                    category: row.get(3)?,
                    internal_note: row.get(4)?,
                    attachment_local_path: row.get(5)?,
                    payment_source: row.get(6)?,
                    status: row.get(7)?,
                    created_at: row.get(8)?,
                    created_by_cashier_id: row.get(9)?,
                })
            })
            .map_err(|e| format!("خطأ: {}", e))?;

        let mut expenses = Vec::new();
        for exp in iter {
            if let Ok(e) = exp {
                expenses.push(e);
            }
        }
        Ok(expenses)
    }

    // --- Receipt Printing (Phase 6) ---
    pub fn record_receipt_print(
        &self,
        invoice_id: &str,
        status: &str,
        failure_reason: Option<&str>,
        cashier_user_id: &str,
    ) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        let local_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO local_receipt_print_events (local_id, invoice_local_id, printed_at, printed_by_cashier_id, print_status, failure_reason)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![local_id, invoice_id, now, cashier_user_id, status, failure_reason],
        )
        .map_err(|e| format!("فشل تسجيل حدث الطباعة: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_user_id),
            "PRINT_RECEIPT",
            "RECEIPT",
            invoice_id,
            None,
            Some(&format!("{{\"status\": \"{}\"}}", status)),
            failure_reason,
        );

        Ok(())
    }

    pub fn update_invoice_note(
        &self,
        invoice_id: &str,
        note: Option<&str>,
        cashier_id: &str,
    ) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();

        let status: String = conn
            .query_row(
                "SELECT status FROM local_invoices WHERE local_id = ?1",
                params![invoice_id],
                |row| row.get(0),
            )
            .map_err(|_| "الفاتورة غير موجودة".to_string())?;

        if status == "PAID" {
            return Err("لا يمكن تعديل ملاحظات فاتورة بعد الدفع".to_string());
        }

        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE local_invoices SET internal_note = ?1, updated_at = ?2 WHERE local_id = ?3",
            params![note, now, invoice_id],
        )
        .map_err(|e| format!("فشل حفظ ملاحظة الفاتورة: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_id),
            "UPDATE_INVOICE_NOTE",
            "INVOICE",
            invoice_id,
            None,
            Some(&format!("{{\"note\": \"{:?}\"}}", note)),
            None,
        );

        Ok(())
    }

    pub fn suspend_invoice(&self, invoice_id: &str, cashier_id: &str) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();

        let status: String = conn
            .query_row(
                "SELECT status FROM local_invoices WHERE local_id = ?1",
                params![invoice_id],
                |row| row.get(0),
            )
            .map_err(|_| "الفاتورة غير موجودة".to_string())?;

        if status == "PAID" {
            return Err("لا يمكن تعليق فاتورة مدفوعة".to_string());
        }

        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE local_invoices SET status = 'SUSPENDED', updated_at = ?1 WHERE local_id = ?2",
            params![now, invoice_id],
        )
        .map_err(|e| format!("فشل تعليق الفاتورة: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_id),
            "SUSPEND_INVOICE",
            "INVOICE",
            invoice_id,
            None,
            Some("{\"status\": \"SUSPENDED\"}"),
            None,
        );

        Ok(())
    }

    pub fn resume_invoice(&self, invoice_id: &str, cashier_id: &str) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE local_invoices SET status = 'DRAFT', updated_at = ?1 WHERE local_id = ?2",
            params![now, invoice_id],
        )
        .map_err(|e| format!("فشل استئناف الفاتورة: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_id),
            "RESUME_INVOICE",
            "INVOICE",
            invoice_id,
            None,
            Some("{\"status\": \"DRAFT\"}"),
            None,
        );

        Ok(())
    }

    pub fn cancel_invoice(
        &self,
        invoice_id: &str,
        reason: Option<&str>,
        cashier_id: &str,
    ) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();

        let status: String = conn
            .query_row(
                "SELECT status FROM local_invoices WHERE local_id = ?1",
                params![invoice_id],
                |row| row.get(0),
            )
            .map_err(|_| "الفاتورة غير موجودة".to_string())?;

        if status == "PAID" {
            return Err("لا يمكن إلغاء فاتورة مدفوعة من واجهة الكاشير".to_string());
        }

        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE local_invoices SET status = 'CANCELLED', updated_at = ?1 WHERE local_id = ?2",
            params![now, invoice_id],
        )
        .map_err(|e| format!("فشل إلغاء الفاتورة: {}", e))?;

        drop(conn);
        let _ = self.log_audit(
            Some(cashier_id),
            "CANCEL_INVOICE",
            "INVOICE",
            invoice_id,
            None,
            Some("{\"status\": \"CANCELLED\"}"),
            reason,
        );

        Ok(())
    }

    pub fn get_invoice_by_id(&self, invoice_id: &str) -> Result<LocalInvoice, String> {
        self.get_invoice_by_id_internal(invoice_id)
    }

    fn get_invoice_by_id_internal(&self, invoice_id: &str) -> Result<LocalInvoice, String> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT i.local_id, i.invoice_number_local, i.status, i.customer_local_id, i.cashier_user_id,
                        i.shift_local_id, i.subtotal, i.total_discount, i.total_surcharge, i.total, i.internal_note,
                        i.paid_at, i.created_at, i.updated_at,
                        c.full_name, c.phone_number
                 FROM local_invoices i
                 LEFT JOIN local_customers c ON i.customer_local_id = c.local_id
                 WHERE i.local_id = ?1",
            )
            .map_err(|e| format!("خطأ: {}", e))?;

        let mut rows = stmt
            .query(params![invoice_id])
            .map_err(|e| format!("خطأ: {}", e))?;

        if let Some(row) = rows.next().map_err(|e| format!("خطأ: {}", e))? {
            let cust_id: Option<String> = row.get(3)?;
            let cust_name: Option<String> = row.get(14)?;
            let cust_phone: Option<String> = row.get(15)?;

            let customer = if let (Some(cid), Some(cname)) = (cust_id.clone(), cust_name) {
                Some(LocalCustomer {
                    local_id: cid,
                    full_name: cname,
                    phone_number: cust_phone,
                    birth_date: None,
                    internal_note: None,
                    created_at: String::new(),
                    updated_at: String::new(),
                    created_by_cashier_id: String::new(),
                })
            } else {
                None
            };

            let mut invoice = LocalInvoice {
                local_id: row.get(0)?,
                invoice_number_local: row.get(1)?,
                status: row.get(2)?,
                customer_local_id: cust_id,
                customer,
                cashier_user_id: row.get(4)?,
                shift_local_id: row.get(5)?,
                subtotal: row.get(6)?,
                total_discount: row.get(7)?,
                total_surcharge: row.get(8)?,
                total: row.get(9)?,
                internal_note: row.get(10)?,
                paid_at: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
                lines: Vec::new(),
                payments: Vec::new(),
            };

            invoice.lines = self.get_lines_for_invoice_internal(&conn, invoice_id)?;
            invoice.payments = self.get_payments_for_invoice_internal(&conn, invoice_id)?;

            Ok(invoice)
        } else {
            Err("الفاتورة غير موجودة".to_string())
        }
    }
}
