import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.service';
import { CustomersModule } from './customers.module';
import { CustomersService } from './customers.service';
import { UsersModule } from '../users/users.module';
import { AuthService } from '../auth/auth.service';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs';

describe('CustomersModule Deep Management & Search Tests', () => {
  let customersService: CustomersService;
  let authService: AuthService;
  let dbService: DatabaseService;
  const testDbFile = './data/test_customers_audit.sqlite';

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
        CustomersModule,
      ],
    }).compile();

    customersService = moduleRef.get<CustomersService>(CustomersService);
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

  it('1. Should return empty customer directory initially', () => {
    const list = customersService.findAll({ limit: 50, offset: 0 });
    expect(list.customers).toEqual([]);
    expect(list.total).toBe(0);
  });

  it('2. Should create customer and retrieve detailed profile', () => {
    const created = customersService.create(
      {
        fullName: 'طارق عبد الله',
        phoneNumber: '01099887766',
        internalNote: 'عميل VIP يفضل حلاقة الذقن بالموس الساخن',
      },
      ownerId,
    );

    expect(created.id).toBeDefined();
    expect(created.full_name).toBe('طارق عبد الله');
    expect(created.phone_number).toBe('01099887766');

    const found = customersService.findOne(created.id);
    expect(found.full_name).toBe('طارق عبد الله');
    expect(found.invoices_count).toBe(0);
    expect(found.total_spent).toBe(0);
  });

  it('3. Should update customer details with audit trail', () => {
    const all = customersService.findAll({ limit: 10, offset: 0 });
    const target = all.customers[0];

    const updated = customersService.update(
      target.id,
      {
        fullName: 'طارق عبد الله المحدث',
        internalNote: 'تفضيل الحلاقة صباحاً',
      },
      ownerId,
    );

    expect(updated.full_name).toBe('طارق عبد الله المحدث');
    expect(updated.internal_note).toBe('تفضيل الحلاقة صباحاً');
  });

  it('4. Should search customers by name or phone number', () => {
    const searchByName = customersService.findAll({
      search: 'طارق',
      limit: 10,
      offset: 0,
    });
    expect(searchByName.total).toBe(1);

    const searchByPhone = customersService.findAll({
      search: '0109988',
      limit: 10,
      offset: 0,
    });
    expect(searchByPhone.total).toBe(1);
  });

  it('5. Should throw NotFoundException when looking up non-existent customer', () => {
    expect(() => {
      customersService.findOne('non-existent-customer-id');
    }).toThrow(NotFoundException);
  });
});
