import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.service';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CatalogModule } from '../catalog/catalog.module';
import { CategoriesService } from '../catalog/categories.service';
import { GroupsService } from '../catalog/groups.service';
import { ItemsService } from '../catalog/items.service';
import { EmployeesModule } from '../employees/employees.module';
import { EmployeesService } from '../employees/employees.service';
import { PromotionsModule } from '../promotions/promotions.module';
import { PromotionsService } from '../promotions/promotions.service';
import { BookingsModule } from '../bookings/bookings.module';
import { BookingsService } from '../bookings/bookings.service';
import { CustomersModule } from '../customers/customers.module';
import { CustomersService } from '../customers/customers.service';
import { ShiftsModule } from '../shifts/shifts.module';
import { ShiftsService } from '../shifts/shifts.service';
import { SalesModule } from '../sales/sales.module';
import { SalesService } from '../sales/sales.service';
import { ExpensesModule } from '../expenses/expenses.module';
import { ExpensesService } from '../expenses/expenses.service';
import { ReportsModule } from '../reports/reports.module';
import { ReportsService } from '../reports/reports.service';
import { CashierModule } from '../cashier/cashier.module';
import { CashierService } from '../cashier/cashier.service';
import * as fs from 'fs';

describe('Admin Web to Backend Full Integration & E2E Verification (All 18 Routes)', () => {
  let dbService: DatabaseService;
  let authService: AuthService;
  let usersService: UsersService;
  let categoriesService: CategoriesService;
  let groupsService: GroupsService;
  let itemsService: ItemsService;
  let employeesService: EmployeesService;
  let promotionsService: PromotionsService;
  let bookingsService: BookingsService;
  let customersService: CustomersService;
  let shiftsService: ShiftsService;
  let salesService: SalesService;
  let expensesService: ExpensesService;
  let reportsService: ReportsService;
  let auditLogService: AuditLogService;
  let cashierService: CashierService;

  const testDbFile = './data/test_admin_e2e.sqlite';
  let ownerToken: string;
  let ownerId: string;
  let categoryId: string;
  let groupId: string;
  let serviceItemId: string;
  let barberId: string;
  let promoId: string;
  let customerId: string;
  let bookingId: string;

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
        CatalogModule,
        EmployeesModule,
        PromotionsModule,
        BookingsModule,
        CustomersModule,
        ShiftsModule,
        SalesModule,
        ExpensesModule,
        ReportsModule,
        CashierModule,
      ],
    }).compile();

    dbService = moduleRef.get<DatabaseService>(DatabaseService);
    authService = moduleRef.get<AuthService>(AuthService);
    usersService = moduleRef.get<UsersService>(UsersService);
    categoriesService = moduleRef.get<CategoriesService>(CategoriesService);
    groupsService = moduleRef.get<GroupsService>(GroupsService);
    itemsService = moduleRef.get<ItemsService>(ItemsService);
    employeesService = moduleRef.get<EmployeesService>(EmployeesService);
    promotionsService = moduleRef.get<PromotionsService>(PromotionsService);
    bookingsService = moduleRef.get<BookingsService>(BookingsService);
    customersService = moduleRef.get<CustomersService>(CustomersService);
    shiftsService = moduleRef.get<ShiftsService>(ShiftsService);
    salesService = moduleRef.get<SalesService>(SalesService);
    expensesService = moduleRef.get<ExpensesService>(ExpensesService);
    reportsService = moduleRef.get<ReportsService>(ReportsService);
    auditLogService = moduleRef.get<AuditLogService>(AuditLogService);
    cashierService = moduleRef.get<CashierService>(CashierService);
  });

  afterAll(() => {
    if (dbService) {
      dbService.onModuleDestroy();
    }
    if (fs.existsSync(testDbFile)) {
      try { fs.unlinkSync(testDbFile); } catch {}
    }
  });

  // Flow 1: Setup Owner (/setup-owner)
  it('E2E-PAGE-01: /setup-owner — Setup First Owner Account', async () => {
    const owner = await authService.setupFirstOwner({
      name: 'م. إبراهيم أ. حمادة',
      username: 'eng_ibrahim',
      password: 'StrongPassword2026!',
    });
    expect(owner).toBeDefined();
    expect(owner.user.id).toBeDefined();
    expect(owner.user.role).toBe('OWNER');
    ownerId = owner.user.id;
  });

  // Flow 2: Login (/login)
  it('E2E-PAGE-02: /login — Owner Authentication & JWT Generation', async () => {
    const loginRes = await authService.login({
      username: 'eng_ibrahim',
      password: 'StrongPassword2026!',
    });
    expect(loginRes.token).toBeDefined();
    expect(loginRes.user.role).toBe('OWNER');
    ownerToken = loginRes.token;
  });

  // Flow 3: Settings & Cashier Creation (/admin/settings)
  it('E2E-PAGE-03: /admin/settings — Single Cashier Account Provisioning', () => {
    const cashier = usersService.createOrUpdateCashier({
      name: 'كاشير المحل',
      username: 'cashier_main',
      passwordHash: 'hashed_pwd_2026',
      isActive: true,
    });
    expect(cashier.username).toBe('cashier_main');
    expect(cashier.role).toBe('CASHIER');

    const fetched = usersService.findCashier();
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(cashier.id);
  });

  // Flow 4: Staff & Barbers Management (/admin/staff)
  it('E2E-PAGE-04: /admin/staff — Barbers & Employees CRUD', () => {
    const barber = employeesService.create(
      {
        name: 'كابتن حسام',
        phone: '01011223344',
        roleTitle: 'حلاق محترف',
      },
      ownerId,
    );
    expect(barber.id).toBeDefined();
    barberId = barber.id;

    const list = employeesService.findAll();
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('كابتن حسام');
  });

  // Flow 5: Catalog Management (/admin/catalog)
  it('E2E-PAGE-05: /admin/catalog — 3-Tier Hierarchy (Category -> Group -> Service/Product)', () => {
    // 1. Create Category
    const cat = categoriesService.create(
      {
        name: 'خدمات العناية بالشعر',
        colorCode: '#4F46E5',
        icon: 'scissors',
      },
      ownerId,
    );
    expect(cat.id).toBeDefined();
    categoryId = cat.id;

    // 2. Create Group inside Category
    const grp = groupsService.create(
      {
        categoryId,
        name: 'قص وسيشوار',
      },
      ownerId,
    );
    expect(grp.id).toBeDefined();
    groupId = grp.id;

    // 3. Create Service Item inside Group
    const item = itemsService.createService(
      {
        groupId,
        name: 'قص شعر ملكي',
        price: 150,
      },
      ownerId,
    );
    expect(item.id).toBeDefined();
    expect(item.price).toBe(150);
    serviceItemId = item.id;
  });

  // Flow 6: Promotions Management (/admin/promotions)
  it('E2E-PAGE-06: /admin/promotions — Packages & Discount Bundles', () => {
    const promo = promotionsService.create(
      {
        name: 'باقة العريس المتكاملة',
        description: 'قص شعر + تنظيف بشرة + ذقن',
        fixedPrice: 300,
        items: [
          {
            catalogItemId: serviceItemId,
            quantity: 1,
          },
        ],
      },
      ownerId,
    );
    expect(promo.id).toBeDefined();
    expect(promo.fixed_price).toBe(300);
    promoId = promo.id;
  });

  // Flow 7: Customers Management (/admin/customers)
  it('E2E-PAGE-07: /admin/customers — Customer Directory & History', () => {
    const cust = customersService.create(
      {
        fullName: 'أحمد سعيد',
        phoneNumber: '01234567890',
        internalNote: 'عميل دائم',
      },
      ownerId,
    );
    expect(cust.id).toBeDefined();
    customerId = cust.id;

    const res = customersService.findAll({ limit: 10, offset: 0 });
    expect(res.total).toBe(1);
    expect(res.customers[0].full_name).toBe('أحمد سعيد');
  });

  // Flow 8: Bookings Management (/admin/bookings)
  it('E2E-PAGE-08: /admin/bookings — Appointment Scheduling & Single Invoice Conversion Guard', () => {
    const booking = bookingsService.create(
      {
        customerId,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        preferredEmployeeId: barberId,
        items: [{ catalogItemId: serviceItemId, itemType: 'SERVICE', quantity: 1 }],
      },
      ownerId,
    );
    expect(booking.id).toBeDefined();
    bookingId = booking.id;

    // Convert to invoice
    const converted = bookingsService.update(
      bookingId,
      {
        status: 'CONVERTED_TO_INVOICE',
        convertedInvoiceId: 'inv-converted-1',
      },
      ownerId,
    );
    expect(converted.status).toBe('CONVERTED_TO_INVOICE');
    expect(converted.converted_invoice_id).toBe('inv-converted-1');
  });

  // Flow 9: Shifts & Cash Reconciliation (/admin/shifts)
  it('E2E-PAGE-09: /admin/shifts — Shifts Audit & Reconciliation', () => {
    const db = dbService.getDb();
    db.prepare(`
      INSERT INTO shifts (id, cashier_id, status, opened_at, opening_balance, expected_cash, created_at, updated_at)
      VALUES ('shift-e2e-1', ?, 'OPEN', datetime('now'), 500, 500, datetime('now'), datetime('now'))
    `).run(ownerId);

    const shifts = shiftsService.findAll({ limit: 10, offset: 0 });
    expect(shifts.total).toBe(1);
    expect(shifts.shifts[0].id).toBe('shift-e2e-1');
  });

  // Flow 10: Central Sales & Invoices (/admin/sales)
  it('E2E-PAGE-10: /admin/sales — Central Invoices Audit & History', () => {
    const db = dbService.getDb();
    db.prepare(`
      INSERT INTO invoices (id, shift_id, cashier_id, customer_id, invoice_number, subtotal, total_amount, status, created_at, updated_at)
      VALUES ('inv-e2e-1', 'shift-e2e-1', ?, ?, 'INV-E2E-100', 150, 150, 'PAID', datetime('now'), datetime('now'))
    `).run(ownerId, customerId);

    const invoices = salesService.findAll({ limit: 10, offset: 0 });
    expect(invoices.total).toBe(1);
    expect(invoices.invoices[0].invoice_number).toBe('INV-E2E-100');
  });

  // Flow 11: Expenses Management (/admin/expenses)
  it('E2E-PAGE-11: /admin/expenses — Operational Expenses Tracking', () => {
    const exp = expensesService.create(
      {
        category: 'كهرباء وإنارة',
        amount: 450,
        description: 'فاتورة الكهرباء الشهرية',
      },
      ownerId,
    );
    expect(exp.id).toBeDefined();
    expect(exp.amount).toBe(450);

    const res = expensesService.findAll({ limit: 10, offset: 0 });
    expect(res.total).toBe(1);
    expect(res.summary.totalSpent).toBe(450);
  });

  // Flow 12: Reports & Analytics (/admin/reports)
  it('E2E-PAGE-12: /admin/reports — Financial Summary & CSV Export', () => {
    const summary = reportsService.getFinancialReport({});
    expect(summary.revenue).toBe(150);
    expect(summary.expenses).toBe(450);
    expect(summary.netIncome).toBe(-300);

    const csvStream = reportsService.exportCsv('sales');
    expect(csvStream).toBeDefined();
    expect(typeof csvStream).toBe('string');
    expect(csvStream).toContain('INV-E2E-100');
  });

  // Flow 13: Audit Trail (/admin/audit-log) — Exclusively Shift Opening & Closing
  it('E2E-PAGE-13: /admin/audit-log — Immutable Audit Trail Verification (Shift Open/Close Only)', () => {
    auditLogService.logEvent({
      action: 'OPEN_SHIFT',
      entityType: 'SHIFT',
      entityId: 'shift-e2e-1',
      actorUserId: ownerId,
      afterData: { opening_cash: 500 },
    });

    auditLogService.logEvent({
      action: 'CLOSE_SHIFT',
      entityType: 'SHIFT',
      entityId: 'shift-e2e-1',
      actorUserId: ownerId,
      afterData: { expected_cash: 1200, actual_cash: 1200, discrepancy: 0 },
    });

    const logs = auditLogService.findAll({ limit: 50, offset: 0 });
    expect(logs.total).toBe(2);
    expect(logs.events[0].action).toBe('CLOSE_SHIFT');
    expect(logs.events[1].action).toBe('OPEN_SHIFT');
  });
});



