import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.service';
import { ExpensesModule } from './expenses.module';
import { ExpensesService } from './expenses.service';
import { UsersModule } from '../users/users.module';
import { AuthService } from '../auth/auth.service';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';

describe('ExpensesModule Deep Business & Financial Tests', () => {
  let expensesService: ExpensesService;
  let authService: AuthService;
  let dbService: DatabaseService;
  const testDbFile = './data/test_expenses_audit.sqlite';

  let ownerId: string;

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
        ExpensesModule,
      ],
    }).compile();

    expensesService = moduleRef.get<ExpensesService>(ExpensesService);
    authService = moduleRef.get<AuthService>(AuthService);
    dbService = moduleRef.get<DatabaseService>(DatabaseService);

    const owner = await authService.setupFirstOwner({
      name: 'مالك الصالون',
      username: 'salon_owner',
      password: 'OwnerPassword123!',
    });
    ownerId = owner.user.id;
  });

  afterAll(() => {
    if (dbService) {
      dbService.onModuleDestroy();
    }
    if (fs.existsSync(testDbFile)) {
      try { fs.unlinkSync(testDbFile); } catch {}
    }
  });

  it('1. Should return empty list and zero summary initially', () => {
    const res = expensesService.findAll({ limit: 50, offset: 0 });
    expect(res.expenses).toEqual([]);
    expect(res.total).toBe(0);
    expect(res.summary.totalSpent).toBe(0);
  });

  it('2. Should reject expense with zero or negative amount', () => {
    expect(() => {
      expensesService.create(
        { category: 'مستلزمات', amount: 0, description: 'فحص المبلغ الصفر' },
        ownerId,
      );
    }).toThrow(BadRequestException);

    expect(() => {
      expensesService.create(
        { category: 'مستلزمات', amount: -50, description: 'فحص المبلغ السالب' },
        ownerId,
      );
    }).toThrow(BadRequestException);
  });

  it('3. Should create valid expense with audit logging and calculate summary', () => {
    const exp1 = expensesService.create(
      { category: 'إيجار', amount: 2000, description: 'إيجار المحل الشهري' },
      ownerId,
    );
    expect(exp1.id).toBeDefined();
    expect(exp1.amount).toBe(2000);
    expect(exp1.category).toBe('إيجار');

    const exp2 = expensesService.create(
      { category: 'صيانة', amount: 350, description: 'صيانة كرسي حلاقة' },
      ownerId,
    );
    expect(exp2.amount).toBe(350);

    const res = expensesService.findAll({ limit: 50, offset: 0 });
    expect(res.total).toBe(2);
    expect(res.summary.totalSpent).toBe(2350);
    expect(res.summary.categoriesCount).toBe(2);
  });

  it('4. Should filter expenses by category and search query', () => {
    const filtered = expensesService.findAll({
      category: 'إيجار',
      limit: 50,
      offset: 0,
    });
    expect(filtered.total).toBe(1);
    expect(filtered.expenses[0].category).toBe('إيجار');

    const searched = expensesService.findAll({
      search: 'كرسي',
      limit: 50,
      offset: 0,
    });
    expect(searched.total).toBe(1);
    expect(searched.expenses[0].description).toContain('كرسي');
  });

  it('5. Should return distinct categories list for filter dropdowns', () => {
    const cats = expensesService.getCategories();
    expect(cats).toContain('إيجار');
    expect(cats).toContain('صيانة');
  });
});
