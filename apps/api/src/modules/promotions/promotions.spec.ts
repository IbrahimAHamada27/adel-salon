import { Test, TestingModule } from '@nestjs/testing';
import { PromotionsService } from './promotions.service';
import { DatabaseService } from '../database/database.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

describe('PromotionsService (Phase 9)', () => {
  let service: PromotionsService;
  let dbService: DatabaseService;
  const testDbFile = path.resolve(process.cwd(), './data/test_promotions.sqlite');

  beforeEach(async () => {
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsService,
        DatabaseService,
        AuditLogService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultVal: string) => {
              if (key === 'DATABASE_FILE') return testDbFile;
              return defaultVal;
            },
          },
        },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
    dbService = module.get<DatabaseService>(DatabaseService);
    dbService.onModuleInit();

    // Seed test catalog items
    const db = dbService.getDb();
    db.prepare(`
      INSERT INTO users (id, name, username, password_hash, role, is_active, created_at, updated_at)
      VALUES ('user_1', 'Owner', 'owner', 'hash', 'OWNER', 1, datetime('now'), datetime('now'))
    `).run();

    db.prepare(`
      INSERT INTO categories (id, name, status, sort_order, created_at, updated_at)
      VALUES ('cat_1', 'قسم العناية', 'ACTIVE', 1, datetime('now'), datetime('now'))
    `).run();

    db.prepare(`
      INSERT INTO groups (id, category_id, name, status, sort_order, created_at, updated_at)
      VALUES ('grp_1', 'cat_1', 'مجموعة الشعر', 'ACTIVE', 1, datetime('now'), datetime('now'))
    `).run();

    db.prepare(`
      INSERT INTO catalog_items (id, group_id, type, name, base_price, status, sort_order, created_at, updated_at)
      VALUES ('item_srv_1', 'grp_1', 'SERVICE', 'قص شعر كلاسيك', 100.0, 'ACTIVE', 1, datetime('now'), datetime('now')),
             ('item_srv_2', 'grp_1', 'SERVICE', 'حلاقة ذقن بالبخار', 60.0, 'ACTIVE', 2, datetime('now'), datetime('now')),
             ('item_prod_1', 'grp_1', 'PRODUCT', 'واكس تصفيف شعر', 50.0, 'ACTIVE', 3, datetime('now'), datetime('now')),
             ('item_archived', 'grp_1', 'SERVICE', 'خدمة قديمة', 40.0, 'ARCHIVED', 4, datetime('now'), datetime('now'))
    `).run();
  });

  afterEach(() => {
    dbService.onModuleDestroy();
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }
  });

  it('1. should reject creating a promotion with empty items or negative price', () => {
    expect(() => {
      service.create(
        {
          name: 'عرض VIP',
          fixedPrice: -10,
          items: [{ catalogItemId: 'item_srv_1' }],
        },
        'user_1',
      );
    }).toThrow(BadRequestException);

    expect(() => {
      service.create(
        {
          name: 'عرض فارغ',
          fixedPrice: 150,
          items: [],
        },
        'user_1',
      );
    }).toThrow(BadRequestException);
  });

  it('2. should reject adding archived/inactive items to active promotion', () => {
    expect(() => {
      service.create(
        {
          name: 'باقة غير صالحة',
          fixedPrice: 100,
          items: [{ catalogItemId: 'item_archived' }],
        },
        'user_1',
      );
    }).toThrow(BadRequestException);
  });

  it('3. should create active promotion and correctly calculate original total and savings', () => {
    const promo = service.create(
      {
        name: 'باقة العناية الشاملة',
        description: 'قص شعر + حلاقة ذقن + واكس هدية',
        fixedPrice: 160.0,
        items: [
          { catalogItemId: 'item_srv_1', quantity: 1 },
          { catalogItemId: 'item_srv_2', quantity: 1 },
          { catalogItemId: 'item_prod_1', quantity: 1 },
        ],
      },
      'user_1',
    );

    expect(promo.id).toBeDefined();
    expect(promo.name).toBe('باقة العناية الشاملة');
    expect(promo.fixed_price).toBe(160.0);
    expect(promo.items).toHaveLength(3);
    // Original total = 100 + 60 + 50 = 210
    expect(promo.original_total_price).toBe(210.0);
    // Savings = 210 - 160 = 50
    expect(promo.savings_amount).toBe(50.0);
  });

  it('4. should filter active promotions for cashier snapshot excluding expired or archived', () => {
    // Promo 1: Active and valid now
    service.create(
      {
        name: 'عرض حالي',
        fixedPrice: 120.0,
        items: [{ catalogItemId: 'item_srv_1' }],
      },
      'user_1',
    );

    // Promo 2: Expired in the past
    const pastDate = new Date(Date.now() - 10 * 86400000).toISOString();
    const pastEnd = new Date(Date.now() - 2 * 86400000).toISOString();
    service.create(
      {
        name: 'عرض منتهي',
        fixedPrice: 90.0,
        startsAt: pastDate,
        endsAt: pastEnd,
        items: [{ catalogItemId: 'item_srv_1' }],
      },
      'user_1',
    );

    // Promo 3: Scheduled in the future
    const futureStart = new Date(Date.now() + 5 * 86400000).toISOString();
    service.create(
      {
        name: 'عرض مستقبلي',
        fixedPrice: 110.0,
        startsAt: futureStart,
        items: [{ catalogItemId: 'item_srv_1' }],
      },
      'user_1',
    );

    const cashierSnapshot = service.getActiveSnapshotForCashier();
    expect(cashierSnapshot).toHaveLength(1);
    expect(cashierSnapshot[0].name).toBe('عرض حالي');
  });
});
