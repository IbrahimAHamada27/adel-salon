import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';

export type SQLiteDatabase = DatabaseSync;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private db!: DatabaseSync;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const dbPath = this.configService.get<string>('DATABASE_FILE', './data/tech_server.sqlite');
    const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
    const dbDir = path.dirname(resolvedPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.logger.log(`Initializing SQLite database at: ${resolvedPath}`);
    this.db = new DatabaseSync(resolvedPath);

    // Performance and integrity pragmas
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA busy_timeout = 5000;');
    this.db.exec('PRAGMA synchronous = NORMAL;');

    this.runMigrations();
  }

  onModuleDestroy() {
    if (this.db) {
      this.logger.log('Closing SQLite database connection');
      this.db.close();
    }
  }

  getDb(): DatabaseSync {
    if (!this.db) {
      this.onModuleInit();
    }
    return this.db;
  }

  transaction<T>(fn: () => T): T {
    const db = this.getDb();
    db.exec('BEGIN IMMEDIATE;');
    try {
      const result = fn();
      db.exec('COMMIT;');
      return result;
    } catch (error) {
      try {
        db.exec('ROLLBACK;');
      } catch {
        // ignore rollback errors if already rolled back
      }
      throw error;
    }
  }

  private runMigrations() {
    this.logger.log('Running database schema migrations...');

    // 1. Users Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('OWNER', 'CASHIER')),
        is_active INTEGER NOT NULL DEFAULT 1,
        last_login_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    try {
      this.db.exec(`ALTER TABLE users ADD COLUMN last_login_at TEXT;`);
    } catch {
      // Column already exists
    }

    // 2. Categories Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color_code TEXT,
        icon TEXT,
        status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'HIDDEN', 'ARCHIVED')) DEFAULT 'ACTIVE',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(created_by) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);
      CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);
    `);

    // 3. Groups Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'HIDDEN', 'ARCHIVED')) DEFAULT 'ACTIVE',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT,
        FOREIGN KEY(created_by) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_groups_category ON groups(category_id);
      CREATE INDEX IF NOT EXISTS idx_groups_sort ON groups(sort_order);
    `);

    // 4. Catalog Items (Services & Products) Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS catalog_items (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('SERVICE', 'PRODUCT')),
        name TEXT NOT NULL,
        base_price REAL NOT NULL DEFAULT 0,
        sku TEXT,
        allow_price_override INTEGER DEFAULT 0,
        status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'HIDDEN', 'ARCHIVED')) DEFAULT 'ACTIVE',
        sort_order INTEGER NOT NULL DEFAULT 0,
        internal_note TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE RESTRICT,
        FOREIGN KEY(created_by) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_items_group ON catalog_items(group_id);
      CREATE INDEX IF NOT EXISTS idx_items_type ON catalog_items(type);
      CREATE INDEX IF NOT EXISTS idx_items_sort ON catalog_items(sort_order);
    `);

    // 5. Employees & Barbers Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        role_title TEXT,
        status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')) DEFAULT 'ACTIVE',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(created_by) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
      CREATE INDEX IF NOT EXISTS idx_employees_sort ON employees(sort_order);
    `);

    // 6. Audit Events Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        actor_user_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        before_data TEXT,
        after_data TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(actor_user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id);
    `);

    // 7. Customers Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        phone_number TEXT,
        birth_date TEXT,
        internal_note TEXT,
        created_by_cashier_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);
      CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(full_name);
    `);

    // 8. Promotions & Packages Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS promotions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        fixed_price REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')) DEFAULT 'ACTIVE',
        starts_at TEXT,
        ends_at TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(created_by) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);
      CREATE INDEX IF NOT EXISTS idx_promotions_sort ON promotions(sort_order);
      CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(starts_at, ends_at);
    `);

    // 8. Promotion Items Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS promotion_items (
        id TEXT PRIMARY KEY,
        promotion_id TEXT NOT NULL,
        catalog_item_id TEXT NOT NULL,
        catalog_item_name_snapshot TEXT NOT NULL,
        catalog_item_type TEXT NOT NULL CHECK(catalog_item_type IN ('SERVICE', 'PRODUCT')),
        quantity INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
        FOREIGN KEY(catalog_item_id) REFERENCES catalog_items(id) ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS idx_promo_items_promo ON promotion_items(promotion_id);
      CREATE INDEX IF NOT EXISTS idx_promo_items_catalog ON promotion_items(catalog_item_id);
    `);

    // 9. Bookings & Appointments Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        guest_name TEXT,
        guest_phone TEXT,
        scheduled_at TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('CONFIRMED', 'ARRIVED', 'NO_SHOW', 'CANCELLED', 'CONVERTED_TO_INVOICE')) DEFAULT 'CONFIRMED',
        preferred_employee_id TEXT,
        internal_note TEXT,
        created_by_user_id TEXT NOT NULL,
        created_from TEXT NOT NULL CHECK(created_from IN ('ADMIN', 'CASHIER')) DEFAULT 'ADMIN',
        converted_invoice_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(preferred_employee_id) REFERENCES employees(id) ON DELETE SET NULL,
        FOREIGN KEY(created_by_user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_bookings_scheduled ON bookings(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
      CREATE INDEX IF NOT EXISTS idx_bookings_employee ON bookings(preferred_employee_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
    `);

    // 10. Booking Items Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS booking_items (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        catalog_item_id TEXT,
        promotion_id TEXT,
        item_name_snapshot TEXT NOT NULL,
        item_type TEXT NOT NULL CHECK(item_type IN ('SERVICE', 'PRODUCT', 'PROMOTION')),
        quantity INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY(catalog_item_id) REFERENCES catalog_items(id) ON DELETE SET NULL,
        FOREIGN KEY(promotion_id) REFERENCES promotions(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);
    `);

    // 11. Shifts Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        cashier_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        opening_balance REAL NOT NULL DEFAULT 0,
        expected_cash REAL NOT NULL DEFAULT 0,
        actual_cash REAL,
        cash_difference REAL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(cashier_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_shifts_cashier ON shifts(cashier_id);
      CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
      CREATE INDEX IF NOT EXISTS idx_shifts_opened ON shifts(opened_at);
    `);

    // 12. Invoices Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        shift_id TEXT,
        cashier_id TEXT,
        customer_id TEXT,
        invoice_number TEXT UNIQUE,
        subtotal REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        total_amount REAL NOT NULL DEFAULT 0,
        payment_method TEXT CHECK(payment_method IN ('CASH', 'CARD', 'SPLIT')) DEFAULT 'CASH',
        status TEXT NOT NULL CHECK(status IN ('DRAFT', 'PAID', 'CANCELLED', 'SUSPENDED')) DEFAULT 'PAID',
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
        FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY(cashier_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_invoices_shift ON invoices(shift_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
      CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);
    `);

    // 13. Invoice Lines Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS invoice_lines (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        catalog_item_id TEXT,
        item_name_snapshot TEXT NOT NULL,
        item_type TEXT NOT NULL CHECK(item_type IN ('SERVICE', 'PRODUCT', 'PROMOTION')),
        unit_price REAL NOT NULL DEFAULT 0,
        quantity INTEGER NOT NULL DEFAULT 1,
        total_price REAL NOT NULL DEFAULT 0,
        barber_employee_id TEXT,
        parent_promotion_id TEXT,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY(barber_employee_id) REFERENCES employees(id) ON DELETE SET NULL,
        FOREIGN KEY(catalog_item_id) REFERENCES catalog_items(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_lines_invoice ON invoice_lines(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_lines_barber ON invoice_lines(barber_employee_id);
    `);

    // 14. Expenses Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        shift_id TEXT,
        cashier_id TEXT,
        category TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        description TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
        FOREIGN KEY(cashier_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_expenses_shift ON expenses(shift_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_created ON expenses(created_at);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    `);

    // 15. Idempotent Sync & Outbox Enhancements
    try {
      this.db.exec(`ALTER TABLE invoices ADD COLUMN operation_id TEXT;`);
    } catch {}
    try {
      this.db.exec(`ALTER TABLE invoices ADD COLUMN sync_id TEXT;`);
    } catch {}
    try {
      this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_op_id ON invoices(operation_id) WHERE operation_id IS NOT NULL;`);
    } catch {}
    try {
      this.db.exec(`ALTER TABLE shifts ADD COLUMN operation_id TEXT;`);
    } catch {}
    try {
      this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_op_id ON shifts(operation_id) WHERE operation_id IS NOT NULL;`);
    } catch {}
    try {
      this.db.exec(`ALTER TABLE expenses ADD COLUMN operation_id TEXT;`);
    } catch {}
    try {
      this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_op_id ON expenses(operation_id) WHERE operation_id IS NOT NULL;`);
    } catch {}

    this.logger.log('Database migrations completed successfully.');
  }
}
