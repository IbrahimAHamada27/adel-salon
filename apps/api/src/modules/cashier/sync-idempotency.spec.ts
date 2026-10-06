import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.service';
import { CashierModule } from './cashier.module';
import { CashierService } from './cashier.service';
import { UsersModule } from '../users/users.module';
import { AuthService } from '../auth/auth.service';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import * as fs from 'fs';

describe('Cashier Outbox Sync & Idempotency Engine Deep Tests', () => {
  let cashierService: CashierService;
  let authService: AuthService;
  let dbService: DatabaseService;
  const testDbFile = './data/test_sync_idempotency.sqlite';

  let cashierId: string;

  beforeAll(async () => {
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ DATABASE_FILE: testDbFile, JWT_SECRET: 'test-secret-key-32-characters-min-safe' })],
        }),
        DatabaseModule,
        AuditLogModule,
        UsersModule,
        AuthModule,
        CashierModule,
      ],
    }).compile();

    cashierService = moduleRef.get<CashierService>(CashierService);
    authService = moduleRef.get<AuthService>(AuthService);
    dbService = moduleRef.get<DatabaseService>(DatabaseService);

    // Setup Owner
    await authService.setupFirstOwner({
      name: 'مالك الصالون',
      username: 'salon_owner',
      password: 'OwnerPassword123!',
    });

    // Create Cashier
    const db = dbService.getDb();
    cashierId = 'cashier-test-id';
    db.prepare(`
      INSERT INTO users (id, name, username, password_hash, role, is_active, created_at, updated_at)
      VALUES (?, 'كاشير الورديات', 'cashier_sync', 'hashed_pass', 'CASHIER', 1, datetime('now'), datetime('now'))
    `).run(cashierId);
  });

  afterAll(() => {
    if (dbService) {
      dbService.onModuleDestroy();
    }
    if (fs.existsSync(testDbFile)) {
      try { fs.unlinkSync(testDbFile); } catch {}
    }
  });

  it('1. Should process initial outbox batch with shift, invoice, payment, and expense', async () => {
    const shiftOpId = 'shift-op-001';
    const invOpId = 'inv-op-001';
    const expOpId = 'exp-op-001';
    const syncId = 'sync-batch-001';

    const res = cashierService.processOutboxSync(
      {
        syncId,
        deviceId: 'device-pos-terminal-1',
        shifts: [
          {
            id: 'local-shift-1',
            operationId: shiftOpId,
            cashierId,
            status: 'OPEN',
            openedAt: new Date().toISOString(),
            openingBalance: 1000,
            expectedCash: 1000,
          },
        ],
        invoices: [
          {
            id: 'local-inv-1',
            operationId: invOpId,
            shiftId: 'local-shift-1',
            cashierId,
            invoiceNumber: 'INV-10001',
            subtotal: 250,
            discountAmount: 0,
            totalAmount: 250,
            paymentMethod: 'CASH',
            status: 'PAID',
            createdAt: new Date().toISOString(),
            lines: [
              {
                id: 'local-line-1',
                itemNameSnapshot: 'قص واستشوار',
                itemType: 'SERVICE',
                unitPrice: 250,
                quantity: 1,
                totalPrice: 250,
              },
            ],
            payments: [
              {
                paymentMethod: 'CASH',
                amount: 250,
                cashReceivedAmount: 300,
                changeAmount: 50,
              },
            ],
          },
        ],
        expenses: [
          {
            id: 'local-exp-1',
            operationId: expOpId,
            shiftId: 'local-shift-1',
            cashierId,
            category: 'مشروبات وضيافة',
            amount: 40,
            description: 'شاي وقهوة للعملاء',
            createdAt: new Date().toISOString(),
          },
        ],
      },
      cashierId,
    );

    expect(res.success).toBe(true);
    expect(res.shiftsCount).toBe(1);
    expect(res.invoicesCount).toBe(1);
    expect(res.expensesCount).toBe(1);

    // Verify in database
    const db = dbService.getDb();
    const invRow = db.prepare(`SELECT * FROM invoices WHERE id = 'local-inv-1'`).get() as any;
    expect(invRow).toBeDefined();
    expect(invRow.total_amount).toBe(250);
    expect(invRow.operation_id).toBe(invOpId);
    expect(invRow.sync_id).toBe(syncId);

    const shiftRow = db.prepare(`SELECT * FROM shifts WHERE id = 'local-shift-1'`).get() as any;
    expect(shiftRow.opening_balance).toBe(1000);
    expect(shiftRow.operation_id).toBe(shiftOpId);
  });

  it('2. IDEMPOTENCY TEST: Re-uploading the exact same batch MUST NOT duplicate records or revenue', async () => {
    const shiftOpId = 'shift-op-001';
    const invOpId = 'inv-op-001';
    const expOpId = 'exp-op-001';
    const syncId = 'sync-batch-001';

    const db = dbService.getDb();
    const countBefore = (db.prepare(`SELECT COUNT(*) as count, SUM(total_amount) as total FROM invoices`).get() as any);

    // Replay the exact same payload
    const res = cashierService.processOutboxSync(
      {
        syncId,
        deviceId: 'device-pos-terminal-1',
        shifts: [
          {
            id: 'local-shift-1',
            operationId: shiftOpId,
            cashierId,
            status: 'OPEN',
            openedAt: new Date().toISOString(),
            openingBalance: 1000,
            expectedCash: 1000,
          },
        ],
        invoices: [
          {
            id: 'local-inv-1',
            operationId: invOpId,
            shiftId: 'local-shift-1',
            cashierId,
            invoiceNumber: 'INV-10001',
            subtotal: 250,
            discountAmount: 0,
            totalAmount: 250,
            paymentMethod: 'CASH',
            status: 'PAID',
            createdAt: new Date().toISOString(),
            lines: [
              {
                id: 'local-line-1',
                itemNameSnapshot: 'قص واستشوار',
                itemType: 'SERVICE',
                unitPrice: 250,
                quantity: 1,
                totalPrice: 250,
              },
            ],
          },
        ],
        expenses: [
          {
            id: 'local-exp-1',
            operationId: expOpId,
            shiftId: 'local-shift-1',
            cashierId,
            category: 'مشروبات وضيافة',
            amount: 40,
            description: 'شاي وقهوة للعملاء',
            createdAt: new Date().toISOString(),
          },
        ],
      },
      cashierId,
    );

    expect(res.success).toBe(true);

    // Assert counts and totals are strictly unchanged!
    const countAfter = (db.prepare(`SELECT COUNT(*) as count, SUM(total_amount) as total FROM invoices`).get() as any);
    expect(countAfter.count).toBe(countBefore.count);
    expect(countAfter.total).toBe(countBefore.total);

    const shiftCount = (db.prepare(`SELECT COUNT(*) as count FROM shifts`).get() as any).count;
    expect(shiftCount).toBe(1);

    const expenseCount = (db.prepare(`SELECT COUNT(*) as count FROM expenses`).get() as any).count;
    expect(expenseCount).toBe(1);
  });

  it('3. Should update invoice status on sync when cashier closes or refunds invoice', async () => {
    const invOpId = 'inv-op-001';

    cashierService.processOutboxSync(
      {
        syncId: 'sync-batch-002',
        invoices: [
          {
            id: 'local-inv-1',
            operationId: invOpId,
            cashierId,
            invoiceNumber: 'INV-10001',
            subtotal: 250,
            discountAmount: 0,
            totalAmount: 250,
            status: 'CANCELLED',
            notes: 'تم استرجاع الفاتورة للعميل',
            createdAt: new Date().toISOString(),
            lines: [],
          },
        ],
      },
      cashierId,
    );

    const db = dbService.getDb();
    const updated = db.prepare(`SELECT * FROM invoices WHERE id = 'local-inv-1'`).get() as any;
    expect(updated.status).toBe('CANCELLED');
    expect(updated.notes).toContain('استرجاع الفاتورة');
  });
});
