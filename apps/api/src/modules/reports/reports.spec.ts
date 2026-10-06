import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.service';
import { ReportsModule } from './reports.module';
import { ReportsService } from './reports.service';
import { UsersModule } from '../users/users.module';
import { AuthService } from '../auth/auth.service';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import * as fs from 'fs';

describe('ReportsModule Financial Calculation & Export Tests', () => {
  let reportsService: ReportsService;
  let authService: AuthService;
  let dbService: DatabaseService;
  const testDbFile = './data/test_reports_audit.sqlite';

  let barberId: string;

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
        ReportsModule,
      ],
    }).compile();

    reportsService = moduleRef.get<ReportsService>(ReportsService);
    authService = moduleRef.get<AuthService>(AuthService);
    dbService = moduleRef.get<DatabaseService>(DatabaseService);

    const owner = await authService.setupFirstOwner({
      name: 'مالك الصالون',
      username: 'salon_owner',
      password: 'OwnerPassword123!',
    });

    const db = dbService.getDb();
    barberId = 'barber-ahmed-1';
    db.prepare(`
      INSERT INTO employees (id, name, phone, role_title, status, sort_order, created_by, created_at, updated_at)
      VALUES (?, 'أحمد الحلاق', '01012345678', 'حلاق محترف', 'ACTIVE', 1, ?, datetime('now'), datetime('now'))
    `).run(barberId, owner.user.id);
  });

  afterAll(() => {
    if (dbService) {
      dbService.onModuleDestroy();
    }
    if (fs.existsSync(testDbFile)) {
      try { fs.unlinkSync(testDbFile); } catch {}
    }
  });

  it('1. Should calculate zero financial metrics when no sales exist', () => {
    const report = reportsService.getFinancialReport({});
    expect(report.revenue).toBe(0);
    expect(report.expenses).toBe(0);
    expect(report.netIncome).toBe(0);
    expect(report.invoicesCount).toBe(0);
  });

  it('2. Should calculate revenue, discounts, cash/card split, and net income accurately', () => {
    const db = dbService.getDb();

    // Insert 2 paid invoices: 1 Cash (200 EGP), 1 Card (300 EGP with 50 discount = subtotal 350)
    db.prepare(`
      INSERT INTO invoices (id, invoice_number, subtotal, discount_amount, total_amount, payment_method, status, created_at, updated_at)
      VALUES 
        ('inv-r1', 'INV-R01', 200, 0, 200, 'CASH', 'PAID', datetime('now'), datetime('now')),
        ('inv-r2', 'INV-R02', 350, 50, 300, 'CARD', 'PAID', datetime('now'), datetime('now'))
    `).run();

    // Insert invoice lines attributed to barber
    db.prepare(`
      INSERT INTO invoice_lines (id, invoice_id, item_name_snapshot, item_type, unit_price, quantity, total_price, barber_employee_id)
      VALUES 
        ('line-r1', 'inv-r1', 'قص شعر رجالي', 'SERVICE', 200, 1, 200, ?),
        ('line-r2', 'inv-r2', 'حلاقة ذقن ملكي', 'SERVICE', 300, 1, 300, ?)
    `).run(barberId, barberId);

    // Insert 1 expense (100 EGP)
    db.prepare(`
      INSERT INTO expenses (id, category, amount, description, created_at)
      VALUES ('exp-r1', 'نظافة', 100, 'مناديل ومطهرات', datetime('now'))
    `).run();

    const report = reportsService.getFinancialReport({});
    expect(report.revenue).toBe(500); // 200 + 300
    expect(report.subtotal).toBe(550); // 200 + 350
    expect(report.discounts).toBe(50);
    expect(report.cashRevenue).toBe(200);
    expect(report.cardRevenue).toBe(300);
    expect(report.expenses).toBe(100);
    expect(report.netIncome).toBe(400); // 500 - 100
    expect(report.invoicesCount).toBe(2);
  });

  it('3. Should calculate individual barber performance accurately', () => {
    const barbers = reportsService.getBarbersReport({});
    expect(barbers.length).toBeGreaterThanOrEqual(1);
    const barber = barbers.find((b: any) => b.barber_id === barberId);
    expect(barber).toBeDefined();
    expect(barber.services_performed).toBe(2);
    expect(barber.total_service_revenue).toBe(500);
  });

  it('4. Should rank top requested services', () => {
    const top = reportsService.getTopServices({});
    expect(top.length).toBe(2);
    expect(top.some((t: any) => t.item_name === 'قص شعر رجالي')).toBe(true);
  });

  it('5. Should generate valid Arabic CSV report without crashing or leaking secrets', () => {
    const csvSales = reportsService.exportCsv('sales');
    expect(csvSales).toBeDefined();
    expect(typeof csvSales).toBe('string');
    expect(csvSales).toContain('رقم الفاتورة');
    expect(csvSales).toContain('INV-R01');

    const csvExpenses = reportsService.exportCsv('expenses');
    expect(csvExpenses).toContain('نظافة');

    const csvShifts = reportsService.exportCsv('shifts');
    expect(csvShifts).toContain('معرف الوردية');
  });
});
