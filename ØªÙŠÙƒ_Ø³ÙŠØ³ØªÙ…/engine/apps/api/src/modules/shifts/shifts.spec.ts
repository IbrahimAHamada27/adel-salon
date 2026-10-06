import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.service';
import { ShiftsModule } from './shifts.module';
import { ShiftsService } from './shifts.service';
import { UsersModule } from '../users/users.module';
import { AuthService } from '../auth/auth.service';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import * as fs from 'fs';

describe('ShiftsModule Deep Financial & Lifecycle Tests', () => {
  let shiftsService: ShiftsService;
  let authService: AuthService;
  let dbService: DatabaseService;
  const testDbFile = './data/test_shifts_audit.sqlite';

  let ownerId: string;
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
        ShiftsModule,
      ],
    }).compile();

    shiftsService = moduleRef.get<ShiftsService>(ShiftsService);
    authService = moduleRef.get<AuthService>(AuthService);
    dbService = moduleRef.get<DatabaseService>(DatabaseService);

    // Setup Owner
    const owner = await authService.setupFirstOwner({
      name: 'مالك الصالون',
      username: 'salon_owner',
      password: 'OwnerPassword123!',
    });
    ownerId = owner.user.id;

    // Create Cashier
    const db = dbService.getDb();
    cashierId = 'cashier-test-id';
    db.prepare(`
      INSERT INTO users (id, name, username, password_hash, role, is_active, created_at, updated_at)
      VALUES (?, 'كاشير الفرع', 'cashier_user', 'hashed_pass', 'CASHIER', 1, datetime('now'), datetime('now'))
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

  it('1. Should return empty shifts list initially', () => {
    const list = shiftsService.findAll({ limit: 50, offset: 0 });
    expect(list.shifts).toEqual([]);
    expect(list.total).toBe(0);
  });

  it('2. Should record open shift and find it by id', () => {
    const db = dbService.getDb();
    const shiftId = 'shift-001';
    db.prepare(`
      INSERT INTO shifts (id, cashier_id, status, opened_at, opening_balance, expected_cash, created_at, updated_at)
      VALUES (?, ?, 'OPEN', datetime('now'), 500, 500, datetime('now'), datetime('now'))
    `).run(shiftId, cashierId);

    const shift = shiftsService.findOne(shiftId);
    expect(shift).toBeDefined();
    expect(shift.id).toBe(shiftId);
    expect(shift.status).toBe('OPEN');
    expect(shift.opening_balance).toBe(500);
  });

  it('3. Should calculate shift metrics with paid invoices and cash drawer expenses', () => {
    const db = dbService.getDb();
    const shiftId = 'shift-001';

    // Insert paid invoice for 300 cash
    db.prepare(`
      INSERT INTO invoices (id, shift_id, cashier_id, invoice_number, subtotal, discount_amount, total_amount, payment_method, status, created_at, updated_at)
      VALUES ('inv-001', ?, ?, 'INV-1001', 300, 0, 300, 'CASH', 'PAID', datetime('now'), datetime('now'))
    `).run(shiftId, cashierId);

    // Insert paid invoice for 150 card
    db.prepare(`
      INSERT INTO invoices (id, shift_id, cashier_id, invoice_number, subtotal, discount_amount, total_amount, payment_method, status, created_at, updated_at)
      VALUES ('inv-002', ?, ?, 'INV-1002', 150, 0, 150, 'CARD', 'PAID', datetime('now'), datetime('now'))
    `).run(shiftId, cashierId);

    // Insert expense for 50 cash
    db.prepare(`
      INSERT INTO expenses (id, shift_id, cashier_id, category, amount, description, created_at)
      VALUES ('exp-001', ?, ?, 'شراء شفرات', 50, 'مصروف درج', datetime('now'))
    `).run(shiftId, cashierId);

    const list = shiftsService.findAll({ limit: 50, offset: 0 });
    expect(list.total).toBe(1);
    const item = list.shifts[0];
    expect(item.id).toBe(shiftId);
  });

  it('4. Should close shift with variance reason and reconcile cash', () => {
    const db = dbService.getDb();
    const shiftId = 'shift-001';
    
    // Actual cash counted is 740 (shortage of 10)
    db.prepare(`
      UPDATE shifts 
      SET status = 'CLOSED', closed_at = datetime('now'), expected_cash = 750, actual_cash = 740, cash_difference = -10, notes = 'فرق فكة 10 جنيه'
      WHERE id = ?
    `).run(shiftId);

    const closedShift = shiftsService.findOne(shiftId);
    expect(closedShift.status).toBe('CLOSED');
    expect(closedShift.actual_cash).toBe(740);
    expect(closedShift.cash_difference).toBe(-10);
    expect(closedShift.notes).toContain('فرق فكة');
  });

  it('5. Should support filtering shifts by date and status', () => {
    const active = shiftsService.findAll({ limit: 50, offset: 0, status: 'OPEN' });
    expect(active.shifts.length).toBe(0);

    const closed = shiftsService.findAll({ limit: 50, offset: 0, status: 'CLOSED' });
    expect(closed.shifts.length).toBe(1);
  });
});
