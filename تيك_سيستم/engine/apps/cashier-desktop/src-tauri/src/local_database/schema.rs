pub const INIT_SCHEMA: &str = r#"
-- 1. Local Encrypted Cashier Session
CREATE TABLE IF NOT EXISTS local_session (
    id TEXT PRIMARY KEY,
    cashier_id TEXT NOT NULL,
    cashier_name TEXT NOT NULL,
    cashier_username TEXT NOT NULL,
    token TEXT NOT NULL,
    last_active TEXT NOT NULL
);

-- 2. Cached Active Categories
CREATE TABLE IF NOT EXISTS cached_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color_code TEXT,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cached_cat_sort ON cached_categories(sort_order);

-- 3. Cached Active Groups
CREATE TABLE IF NOT EXISTS cached_groups (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(category_id) REFERENCES cached_categories(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cached_grp_cat ON cached_groups(category_id);
CREATE INDEX IF NOT EXISTS idx_cached_grp_sort ON cached_groups(sort_order);

-- 4. Cached Active Services & Products
CREATE TABLE IF NOT EXISTS cached_items (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('SERVICE', 'PRODUCT')),
    name TEXT NOT NULL,
    base_price REAL NOT NULL DEFAULT 0,
    sku TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    internal_note TEXT,
    FOREIGN KEY(group_id) REFERENCES cached_groups(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cached_items_grp ON cached_items(group_id);
CREATE INDEX IF NOT EXISTS idx_cached_items_sort ON cached_items(sort_order);

-- 5. Cached Active Employees / Barbers
CREATE TABLE IF NOT EXISTS cached_employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role_title TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cached_emp_sort ON cached_employees(sort_order);

-- 6. Synchronization Metadata
CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 7. Local Customers
CREATE TABLE IF NOT EXISTS local_customers (
    local_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    birth_date TEXT,
    internal_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by_cashier_id TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING'
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON local_customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_name ON local_customers(full_name);

-- 8. Local Shifts
CREATE TABLE IF NOT EXISTS local_shifts (
    local_id TEXT PRIMARY KEY,
    cashier_user_id TEXT NOT NULL,
    cashier_display_name_snapshot TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('OPEN', 'CLOSING', 'CLOSED_PENDING_SYNC')),
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    opening_cash_amount REAL NOT NULL DEFAULT 0,
    expected_cash_amount REAL NOT NULL DEFAULT 0,
    actual_cash_amount REAL,
    cash_difference_amount REAL,
    closing_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING'
);
CREATE INDEX IF NOT EXISTS idx_shifts_cashier ON local_shifts(cashier_user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON local_shifts(status);

-- 9. Local Invoices (Drafts, Suspended, Paid, Cancelled)
CREATE TABLE IF NOT EXISTS local_invoices (
    local_id TEXT PRIMARY KEY,
    invoice_number_local INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('DRAFT', 'SUSPENDED', 'AWAITING_PAYMENT', 'PAID', 'CANCELLED')),
    customer_local_id TEXT,
    cashier_user_id TEXT NOT NULL,
    shift_local_id TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    total_discount REAL NOT NULL DEFAULT 0,
    total_surcharge REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    internal_note TEXT,
    paid_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING',
    FOREIGN KEY(customer_local_id) REFERENCES local_customers(local_id) ON DELETE SET NULL,
    FOREIGN KEY(shift_local_id) REFERENCES local_shifts(local_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON local_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON local_invoices(invoice_number_local);
CREATE INDEX IF NOT EXISTS idx_invoices_shift ON local_invoices(shift_local_id);

-- 10. Local Invoice Lines
CREATE TABLE IF NOT EXISTS local_invoice_lines (
    local_id TEXT PRIMARY KEY,
    invoice_local_id TEXT NOT NULL,
    catalog_item_id TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK(item_type IN ('SERVICE', 'PRODUCT')),
    item_name_snapshot TEXT NOT NULL,
    original_unit_price_snapshot REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    assigned_employee_id TEXT,
    assigned_employee_name_snapshot TEXT,
    internal_note TEXT,
    line_subtotal REAL NOT NULL DEFAULT 0,
    line_final_total REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(invoice_local_id) REFERENCES local_invoices(local_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_lines_invoice ON local_invoice_lines(invoice_local_id);

-- 11. Local Line Adjustments
CREATE TABLE IF NOT EXISTS local_line_adjustments (
    local_id TEXT PRIMARY KEY,
    invoice_line_local_id TEXT NOT NULL,
    adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('MANUAL_PRICE_OVERRIDE', 'FIXED_DISCOUNT', 'PERCENTAGE_DISCOUNT', 'FIXED_SURCHARGE', 'PERCENTAGE_SURCHARGE')),
    original_price_before REAL NOT NULL,
    resulting_price_after REAL NOT NULL,
    input_value REAL NOT NULL,
    reason TEXT,
    performed_by_cashier_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(invoice_line_local_id) REFERENCES local_invoice_lines(local_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_adj_line ON local_line_adjustments(invoice_line_local_id);

-- 12. Local Payments (Split payments supported)
CREATE TABLE IF NOT EXISTS local_payments (
    local_id TEXT PRIMARY KEY,
    invoice_local_id TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH', 'INSTAPAY', 'WALLET', 'CARD')),
    amount REAL NOT NULL,
    cash_received_amount REAL,
    change_amount REAL,
    reference_note TEXT,
    created_at TEXT NOT NULL,
    created_by_cashier_id TEXT NOT NULL,
    FOREIGN KEY(invoice_local_id) REFERENCES local_invoices(local_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON local_payments(invoice_local_id);

-- 13. Local Expenses (Within open shift)
CREATE TABLE IF NOT EXISTS local_expenses (
    local_id TEXT PRIMARY KEY,
    shift_local_id TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    internal_note TEXT,
    attachment_local_path TEXT,
    payment_source TEXT NOT NULL DEFAULT 'CASH_DRAWER' CHECK(payment_source IN ('CASH_DRAWER')),
    status TEXT NOT NULL DEFAULT 'RECORDED' CHECK(status IN ('RECORDED', 'VOIDED')),
    created_at TEXT NOT NULL,
    created_by_cashier_id TEXT NOT NULL,
    FOREIGN KEY(shift_local_id) REFERENCES local_shifts(local_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_expenses_shift ON local_expenses(shift_local_id);

-- 14. Local Receipt Print Events
CREATE TABLE IF NOT EXISTS local_receipt_print_events (
    local_id TEXT PRIMARY KEY,
    invoice_local_id TEXT NOT NULL,
    printed_at TEXT NOT NULL,
    printed_by_cashier_id TEXT NOT NULL,
    print_status TEXT NOT NULL CHECK(print_status IN ('SUCCESS', 'FAILED')),
    failure_reason TEXT,
    FOREIGN KEY(invoice_local_id) REFERENCES local_invoices(local_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_prints_invoice ON local_receipt_print_events(invoice_local_id);

-- 15. Local Audit Events
CREATE TABLE IF NOT EXISTS local_audit_events (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    before_data TEXT,
    after_data TEXT,
    reason TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_local_audit_created ON local_audit_events(created_at);
"#;
