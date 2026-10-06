import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { OutboxSyncDto } from './dto/outbox-sync.dto';

export interface CashierCategorySnapshot {
  id: string;
  name: string;
  colorCode?: string | null;
  icon?: string | null;
  sortOrder: number;
}

export interface CashierGroupSnapshot {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
}

export interface CashierItemSnapshot {
  id: string;
  groupId: string;
  type: 'SERVICE' | 'PRODUCT';
  name: string;
  basePrice: number;
  sku?: string | null;
  sortOrder: number;
  internalNote?: string | null;
}

export interface CashierCatalogSnapshotResponse {
  generatedAt: string;
  version: number;
  categories: CashierCategorySnapshot[];
  groups: CashierGroupSnapshot[];
  items: CashierItemSnapshot[];
}

export interface CashierEmployeeSnapshot {
  id: string;
  name: string;
  roleTitle?: string | null;
  sortOrder: number;
}

export interface CashierEmployeesSnapshotResponse {
  generatedAt: string;
  count: number;
  employees: CashierEmployeeSnapshot[];
}

@Injectable()
export class CashierService {
  private readonly logger = new Logger(CashierService.name);

  constructor(
    private readonly dbService: DatabaseService,
    private readonly auditLogService: AuditLogService,
  ) {}

  getCatalogSnapshot(): CashierCatalogSnapshotResponse {
    const db = this.dbService.getDb();
    const now = new Date().toISOString();
    const version = Date.now();

    // 1. Fetch only ACTIVE categories
    const categoriesRaw = db.prepare(`
      SELECT id, name, color_code, icon, sort_order
      FROM categories
      WHERE status = 'ACTIVE'
      ORDER BY sort_order ASC, created_at ASC
    `).all() as Array<{ id: string; name: string; color_code?: string | null; icon?: string | null; sort_order: number }>;

    const categories: CashierCategorySnapshot[] = categoriesRaw.map((c) => ({
      id: c.id,
      name: c.name,
      colorCode: c.color_code || null,
      icon: c.icon || null,
      sortOrder: c.sort_order,
    }));

    // 2. Fetch only ACTIVE groups belonging to active categories
    const groupsRaw = db.prepare(`
      SELECT g.id, g.category_id, g.name, g.sort_order
      FROM groups g
      INNER JOIN categories c ON g.category_id = c.id
      WHERE g.status = 'ACTIVE' AND c.status = 'ACTIVE'
      ORDER BY g.sort_order ASC, g.created_at ASC
    `).all() as Array<{ id: string; category_id: string; name: string; sort_order: number }>;

    const groups: CashierGroupSnapshot[] = groupsRaw.map((g) => ({
      id: g.id,
      categoryId: g.category_id,
      name: g.name,
      sortOrder: g.sort_order,
    }));

    // 3. Fetch only ACTIVE items belonging to active groups
    const itemsRaw = db.prepare(`
      SELECT i.id, i.group_id, i.type, i.name, i.base_price, i.sku, i.sort_order, i.internal_note
      FROM catalog_items i
      INNER JOIN groups g ON i.group_id = g.id
      INNER JOIN categories c ON g.category_id = c.id
      WHERE i.status = 'ACTIVE' AND g.status = 'ACTIVE' AND c.status = 'ACTIVE'
      ORDER BY i.sort_order ASC, i.created_at ASC
    `).all() as Array<{
      id: string;
      group_id: string;
      type: 'SERVICE' | 'PRODUCT';
      name: string;
      base_price: number;
      sku?: string | null;
      sort_order: number;
      internal_note?: string | null;
    }>;

    const items: CashierItemSnapshot[] = itemsRaw.map((i) => ({
      id: i.id,
      groupId: i.group_id,
      type: i.type,
      name: i.name,
      basePrice: Number(i.base_price),
      sku: i.sku || null,
      sortOrder: i.sort_order,
      internalNote: i.internal_note || null,
    }));

    this.logger.log(
      `Generated Cashier Catalog Snapshot: ${categories.length} categories, ${groups.length} groups, ${items.length} items.`,
    );

    return {
      generatedAt: now,
      version,
      categories,
      groups,
      items,
    };
  }

  getEmployeesSnapshot(): CashierEmployeesSnapshotResponse {
    const db = this.dbService.getDb();
    const now = new Date().toISOString();

    const employeesRaw = db.prepare(`
      SELECT id, name, role_title, sort_order
      FROM employees
      WHERE status = 'ACTIVE'
      ORDER BY sort_order ASC, created_at ASC
    `).all() as Array<{ id: string; name: string; role_title?: string | null; sort_order: number }>;

    const employees: CashierEmployeeSnapshot[] = employeesRaw.map((e) => ({
      id: e.id,
      name: e.name,
      roleTitle: e.role_title || null,
      sortOrder: e.sort_order,
    }));

    return {
      generatedAt: now,
      count: employees.length,
      employees,
    };
  }

  processOutboxSync(
    dto: OutboxSyncDto,
    cashierUserId: string,
  ): {
    success: boolean;
    syncedAt: string;
    shiftsCount: number;
    invoicesCount: number;
    expensesCount: number;
    customersCount: number;
  } {
    const db = this.dbService.getDb();
    const now = new Date().toISOString();

    return this.dbService.transaction(() => {
      let customersCount = 0;
      let shiftsCount = 0;
      let invoicesCount = 0;
      let expensesCount = 0;

      // 1. Upsert Customers
      if (dto.customers && dto.customers.length > 0) {
        const stmt = db.prepare(`
          INSERT INTO customers (
            id, full_name, phone_number, birth_date, internal_note, created_by_cashier_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            full_name = excluded.full_name,
            phone_number = excluded.phone_number,
            birth_date = excluded.birth_date,
            internal_note = excluded.internal_note,
            updated_at = excluded.updated_at
        `);

        for (const c of dto.customers) {
          if (!c.id || !c.fullName) continue;
          stmt.run(
            c.id,
            c.fullName.trim(),
            c.phoneNumber?.trim() || null,
            c.birthDate?.trim() || null,
            c.internalNote?.trim() || null,
            cashierUserId,
            c.createdAt || now,
            now,
          );
          customersCount++;
        }
      }

      // 2. Upsert Shifts
      if (dto.shifts && dto.shifts.length > 0) {
        const shiftStmt = db.prepare(`
          INSERT INTO shifts (
            id, cashier_id, status, opened_at, closed_at, opening_balance, expected_cash, actual_cash, cash_difference, notes, operation_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            closed_at = excluded.closed_at,
            expected_cash = excluded.expected_cash,
            actual_cash = excluded.actual_cash,
            cash_difference = excluded.cash_difference,
            notes = excluded.notes,
            operation_id = excluded.operation_id,
            updated_at = excluded.updated_at
        `);

        for (const s of dto.shifts) {
          if (!s.id) continue;
          const serverStatus = (s.status as string) === 'OPEN' || (s.status as string) === 'CLOSING' ? 'OPEN' : 'CLOSED';
          const shiftCashierId = s.cashierId && s.cashierId !== 'cashier-1' ? s.cashierId : cashierUserId;
          const opId = s.operationId || s.id;

          shiftStmt.run(
            s.id,
            shiftCashierId,
            serverStatus,
            s.openedAt || now,
            s.closedAt || null,
            s.openingBalance || 0,
            s.expectedCash || 0,
            s.actualCash !== undefined && s.actualCash !== null ? s.actualCash : null,
            s.cashDifference || 0,
            s.notes || null,
            opId,
            s.createdAt || now,
            now,
          );
          shiftsCount++;

          // Record Shift Audit Events
          if (serverStatus === 'OPEN') {
            this.auditLogService.logEvent({
              actorUserId: shiftCashierId,
              action: 'OPEN_SHIFT',
              entityType: 'SHIFT',
              entityId: s.id,
              afterData: {
                shiftId: s.id,
                openingBalance: s.openingBalance,
                openedAt: s.openedAt || now,
              },
            });
          } else if (serverStatus === 'CLOSED') {
            this.auditLogService.logEvent({
              actorUserId: shiftCashierId,
              action: 'CLOSE_SHIFT',
              entityType: 'SHIFT',
              entityId: s.id,
              afterData: {
                shiftId: s.id,
                openingBalance: s.openingBalance,
                expectedCash: s.expectedCash,
                actualCash: s.actualCash,
                cashDifference: s.cashDifference,
                closingNotes: s.notes,
                closedAt: s.closedAt || now,
              },
            });
          }
        }
      }

      // 3. Upsert Invoices and Invoice Lines
      if (dto.invoices && dto.invoices.length > 0) {
        const findByNumStmt = db.prepare(`SELECT id FROM invoices WHERE invoice_number = ?`);
        const findByOpStmt = db.prepare(`SELECT id FROM invoices WHERE operation_id = ?`);
        const invStmt = db.prepare(`
          INSERT INTO invoices (
            id, shift_id, cashier_id, customer_id, invoice_number, subtotal, discount_amount, total_amount, payment_method, status, notes, operation_id, sync_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            shift_id = excluded.shift_id,
            customer_id = excluded.customer_id,
            invoice_number = excluded.invoice_number,
            subtotal = excluded.subtotal,
            discount_amount = excluded.discount_amount,
            total_amount = excluded.total_amount,
            payment_method = excluded.payment_method,
            status = excluded.status,
            notes = excluded.notes,
            operation_id = excluded.operation_id,
            sync_id = excluded.sync_id,
            updated_at = excluded.updated_at
        `);

        const deleteLinesStmt = db.prepare(`DELETE FROM invoice_lines WHERE invoice_id = ?`);
        const insertLineStmt = db.prepare(`
          INSERT INTO invoice_lines (
            id, invoice_id, catalog_item_id, item_name_snapshot, item_type, unit_price, quantity, total_price, barber_employee_id, parent_promotion_id, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const inv of dto.invoices) {
          if (!inv.id) continue;

          // Determine high-level payment method
          let paymentMethod = 'CASH';
          if (inv.payments && inv.payments.length > 0) {
            const hasCash = inv.payments.some((p) => p.paymentMethod === 'CASH');
            const hasNonCash = inv.payments.some((p) => p.paymentMethod !== 'CASH');
            if (hasCash && hasNonCash) {
              paymentMethod = 'SPLIT';
            } else if (!hasCash) {
              const firstMethod = inv.payments[0]?.paymentMethod || 'CARD';
              paymentMethod = firstMethod === 'CARD' || firstMethod === 'INSTAPAY' || firstMethod === 'WALLET' ? firstMethod : 'CARD';
            }
          }

          const invCashierId = inv.cashierId && inv.cashierId !== 'cashier-1' ? inv.cashierId : cashierUserId;
          const invNum = inv.invoiceNumber ? String(inv.invoiceNumber) : inv.id;
          const opId = inv.operationId || inv.id;

          // Check if invoice exists by operation_id or invoice_number with different ID
          let existing = findByOpStmt.get(opId) as { id: string } | undefined;
          if (!existing) {
            existing = findByNumStmt.get(invNum) as { id: string } | undefined;
          }
          const resolvedId = existing ? existing.id : inv.id;

          invStmt.run(
            resolvedId,
            inv.shiftId || null,
            invCashierId,
            inv.customerId || null,
            invNum,
            inv.subtotal || 0,
            inv.discountAmount || 0,
            inv.totalAmount || 0,
            paymentMethod,
            inv.status || 'PAID',
            inv.notes || null,
            opId,
            dto.syncId || null,
            inv.createdAt || now,
            inv.paidAt || now,
          );

          deleteLinesStmt.run(resolvedId);

          if (inv.lines && inv.lines.length > 0) {
            let sort = 0;
            for (const line of inv.lines) {
              insertLineStmt.run(
                line.id || 'line_' + Math.random().toString(36).substring(2, 9),
                resolvedId,
                line.catalogItemId || null,
                line.itemNameSnapshot || 'خدمة/منتج',
                line.itemType || 'SERVICE',
                line.unitPrice || 0,
                line.quantity || 1,
                line.totalPrice || 0,
                line.barberEmployeeId || null,
                line.parentPromotionId || null,
                line.sortOrder || sort++,
              );
            }
          }

          invoicesCount++;
        }
      }

      // 4. Upsert Expenses
      if (dto.expenses && dto.expenses.length > 0) {
        const expStmt = db.prepare(`
          INSERT INTO expenses (
            id, shift_id, cashier_id, category, amount, description, operation_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            amount = excluded.amount,
            category = excluded.category,
            description = excluded.description,
            operation_id = excluded.operation_id
        `);

        for (const exp of dto.expenses) {
          if (!exp.id) continue;
          const expCashierId = exp.cashierId && exp.cashierId !== 'cashier-1' ? exp.cashierId : cashierUserId;
          const opId = exp.operationId || exp.id;

          expStmt.run(
            exp.id,
            exp.shiftId || null,
            expCashierId,
            exp.category || 'عام',
            exp.amount || 0,
            exp.description || null,
            opId,
            exp.createdAt || now,
          );
          expensesCount++;
        }
      }

      this.logger.log(
        `Outbox sync processed by cashier ${cashierUserId}: ${shiftsCount} shifts, ${invoicesCount} invoices, ${expensesCount} expenses, ${customersCount} customers.`,
      );

      return {
        success: true,
        syncedAt: now,
        shiftsCount,
        invoicesCount,
        expensesCount,
        customersCount,
      };
    });
  }
}
