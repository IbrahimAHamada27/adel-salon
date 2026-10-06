pub mod commands;
pub mod local_database;
pub mod security;
pub mod sync_catalog;

use commands::auth_cmd::{get_local_session, login_cashier, logout_cashier};
use commands::catalog_cmd::{get_local_catalog, get_local_employees};
use commands::sales_cmd::{
    add_item_to_invoice, apply_line_adjustment, assign_barber_to_line, cancel_invoice,
    close_shift, create_customer, create_draft_invoice, get_active_shift,
    get_active_shift_expenses, get_active_shift_paid_invoices, get_open_invoices,
    get_shift_summary, open_shift, process_invoice_payment, record_receipt_print,
    record_shift_expense, remove_invoice_line, resume_invoice, search_customers,
    set_invoice_customer, suspend_invoice, update_invoice_note, update_line_quantity,
};
use commands::sync_cmd::{check_connectivity, sync_catalog_from_server};
use local_database::db::LocalDatabase;
use security::key_store::SecureKeyStore;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| PathBuf::from("./data/cashier"));

            let encryption_key = SecureKeyStore::get_or_create_db_key(&app_data_dir)
                .expect("فشل تهيئة مفتاح التشفير الآمن لقاعدة البيانات المحلية");

            let db_path = app_data_dir.join("tech_cashier_encrypted.db");

            let local_db = LocalDatabase::new(db_path, &encryption_key)
                .expect("فشل تهيئة قاعدة البيانات المحلية المشفرة SQLCipher");

            app.manage(Arc::new(local_db));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            login_cashier,
            get_local_session,
            logout_cashier,
            sync_catalog_from_server,
            get_local_catalog,
            get_local_employees,
            check_connectivity,
            open_shift,
            get_active_shift,
            get_shift_summary,
            close_shift,
            create_draft_invoice,
            get_open_invoices,
            get_active_shift_paid_invoices,
            set_invoice_customer,
            add_item_to_invoice,
            update_line_quantity,
            remove_invoice_line,
            assign_barber_to_line,
            apply_line_adjustment,
            update_invoice_note,
            suspend_invoice,
            resume_invoice,
            cancel_invoice,
            process_invoice_payment,
            record_shift_expense,
            get_active_shift_expenses,
            record_receipt_print,
            create_customer,
            search_customers,
        ])
        .run(tauri::generate_context!())
        .expect("حدث خطأ أثناء تشغيل تطبيق الكاشير المكتبي");
}


