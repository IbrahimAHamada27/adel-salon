use crate::local_database::db::{
    LocalCustomer, LocalExpense, LocalInvoice, LocalPaymentInput, LocalShift, LocalDatabase,
    ShiftSummary,
};
use std::sync::Arc;
use tauri::State;

// --- Shifts ---
#[tauri::command]
pub fn open_shift(
    db: State<Arc<LocalDatabase>>,
    cashier_user_id: String,
    cashier_display_name: String,
    opening_cash: f64,
) -> Result<LocalShift, String> {
    db.open_shift(&cashier_user_id, &cashier_display_name, opening_cash)
}

#[tauri::command]
pub fn get_active_shift(
    db: State<Arc<LocalDatabase>>,
    cashier_user_id: String,
) -> Result<Option<LocalShift>, String> {
    db.get_active_shift(&cashier_user_id)
}

#[tauri::command]
pub fn get_shift_summary(
    db: State<Arc<LocalDatabase>>,
    shift_id: String,
) -> Result<ShiftSummary, String> {
    db.get_shift_summary(&shift_id)
}

#[tauri::command]
pub fn close_shift(
    db: State<Arc<LocalDatabase>>,
    shift_id: String,
    actual_cash: f64,
    closing_note: Option<String>,
    cashier_user_id: String,
) -> Result<LocalShift, String> {
    db.close_shift(&shift_id, actual_cash, closing_note.as_deref(), &cashier_user_id)
}

// --- Invoices & Drafts ---
#[tauri::command]
pub fn create_draft_invoice(
    db: State<Arc<LocalDatabase>>,
    cashier_id: String,
) -> Result<LocalInvoice, String> {
    db.create_draft_invoice(&cashier_id)
}

#[tauri::command]
pub fn get_open_invoices(
    db: State<Arc<LocalDatabase>>,
) -> Result<Vec<LocalInvoice>, String> {
    db.get_open_invoices()
}

#[tauri::command]
pub fn get_active_shift_paid_invoices(
    db: State<Arc<LocalDatabase>>,
    shift_id: String,
) -> Result<Vec<LocalInvoice>, String> {
    db.get_active_shift_paid_invoices(&shift_id)
}

#[tauri::command]
pub fn set_invoice_customer(
    db: State<Arc<LocalDatabase>>,
    invoice_id: String,
    customer_id: Option<String>,
    cashier_id: String,
) -> Result<LocalInvoice, String> {
    db.set_invoice_customer(&invoice_id, customer_id.as_deref(), &cashier_id)?;
    db.get_invoice_by_id(&invoice_id)
}

#[tauri::command]
pub fn add_item_to_invoice(
    db: State<Arc<LocalDatabase>>,
    invoice_id: String,
    catalog_item_id: String,
    cashier_id: String,
) -> Result<LocalInvoice, String> {
    db.add_item_to_invoice(&invoice_id, &catalog_item_id, &cashier_id)
}

#[tauri::command]
pub fn update_line_quantity(
    db: State<Arc<LocalDatabase>>,
    line_id: String,
    new_quantity: i32,
    cashier_id: String,
) -> Result<LocalInvoice, String> {
    db.update_line_quantity(&line_id, new_quantity, &cashier_id)
}

#[tauri::command]
pub fn remove_invoice_line(
    db: State<Arc<LocalDatabase>>,
    line_id: String,
    cashier_id: String,
) -> Result<LocalInvoice, String> {
    db.remove_invoice_line(&line_id, &cashier_id)
}

#[tauri::command]
pub fn assign_barber_to_line(
    db: State<Arc<LocalDatabase>>,
    line_id: String,
    employee_id: Option<String>,
    cashier_id: String,
) -> Result<LocalInvoice, String> {
    db.assign_barber_to_line(&line_id, employee_id.as_deref(), &cashier_id)
}

#[tauri::command]
pub fn apply_line_adjustment(
    db: State<Arc<LocalDatabase>>,
    line_id: String,
    adjustment_type: String,
    input_value: f64,
    reason: Option<String>,
    cashier_id: String,
) -> Result<LocalInvoice, String> {
    db.apply_line_adjustment(
        &line_id,
        &adjustment_type,
        input_value,
        reason.as_deref(),
        &cashier_id,
    )
}

#[tauri::command]
pub fn update_invoice_note(
    db: State<Arc<LocalDatabase>>,
    invoice_id: String,
    note: Option<String>,
    cashier_id: String,
) -> Result<LocalInvoice, String> {
    db.update_invoice_note(&invoice_id, note.as_deref(), &cashier_id)?;
    db.get_invoice_by_id(&invoice_id)
}

#[tauri::command]
pub fn suspend_invoice(
    db: State<Arc<LocalDatabase>>,
    invoice_id: String,
    cashier_id: String,
) -> Result<(), String> {
    db.suspend_invoice(&invoice_id, &cashier_id)
}

#[tauri::command]
pub fn resume_invoice(
    db: State<Arc<LocalDatabase>>,
    invoice_id: String,
    cashier_id: String,
) -> Result<LocalInvoice, String> {
    db.resume_invoice(&invoice_id, &cashier_id)?;
    db.get_invoice_by_id(&invoice_id)
}

#[tauri::command]
pub fn cancel_invoice(
    db: State<Arc<LocalDatabase>>,
    invoice_id: String,
    reason: Option<String>,
    cashier_id: String,
) -> Result<(), String> {
    db.cancel_invoice(&invoice_id, reason.as_deref(), &cashier_id)
}

// --- Payments & Checkout ---
#[tauri::command]
pub fn process_invoice_payment(
    db: State<Arc<LocalDatabase>>,
    invoice_id: String,
    shift_id: String,
    payments: Vec<LocalPaymentInput>,
    cashier_user_id: String,
) -> Result<LocalInvoice, String> {
    db.process_invoice_payment(&invoice_id, &shift_id, &payments, &cashier_user_id)
}

// --- Expenses ---
#[tauri::command]
pub fn record_shift_expense(
    db: State<Arc<LocalDatabase>>,
    shift_id: String,
    amount: f64,
    category: String,
    note: Option<String>,
    cashier_user_id: String,
) -> Result<LocalExpense, String> {
    db.record_expense(&shift_id, amount, &category, note.as_deref(), &cashier_user_id)
}

#[tauri::command]
pub fn get_active_shift_expenses(
    db: State<Arc<LocalDatabase>>,
    shift_id: String,
) -> Result<Vec<LocalExpense>, String> {
    db.get_active_shift_expenses(&shift_id)
}

// --- Receipt Print Event ---
#[tauri::command]
pub fn record_receipt_print(
    db: State<Arc<LocalDatabase>>,
    invoice_id: String,
    status: String,
    failure_reason: Option<String>,
    cashier_user_id: String,
) -> Result<(), String> {
    db.record_receipt_print(&invoice_id, &status, failure_reason.as_deref(), &cashier_user_id)
}

// --- Customer ---
#[tauri::command]
pub fn create_customer(
    db: State<Arc<LocalDatabase>>,
    full_name: String,
    phone_number: Option<String>,
    birth_date: Option<String>,
    internal_note: Option<String>,
    cashier_id: String,
) -> Result<LocalCustomer, String> {
    db.create_customer(
        &full_name,
        phone_number.as_deref(),
        birth_date.as_deref(),
        internal_note.as_deref(),
        &cashier_id,
    )
}

#[tauri::command]
pub fn search_customers(
    db: State<Arc<LocalDatabase>>,
    query: String,
) -> Result<Vec<LocalCustomer>, String> {
    db.search_customers(&query)
}
