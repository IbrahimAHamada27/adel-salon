import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { DatabaseService } from '../database/database.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

describe('BookingsService (Phase 9)', () => {
  let service: BookingsService;
  let dbService: DatabaseService;
  const testDbFile = path.resolve(process.cwd(), './data/test_bookings.sqlite');

  beforeEach(async () => {
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
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

    service = module.get<BookingsService>(BookingsService);
    dbService = module.get<DatabaseService>(DatabaseService);
    dbService.onModuleInit();

    const db = dbService.getDb();
    db.prepare(`
      INSERT INTO users (id, name, username, password_hash, role, is_active, created_at, updated_at)
      VALUES ('user_1', 'Owner', 'owner', 'hash', 'OWNER', 1, datetime('now'), datetime('now'))
    `).run();

    db.prepare(`
      INSERT INTO employees (id, name, role_title, status, sort_order, created_at, updated_at)
      VALUES ('emp_1', 'كابتن محمود', 'حلاق محترف', 'ACTIVE', 1, datetime('now'), datetime('now')),
             ('emp_2', 'كابتن ياسر', 'حلاق محترف', 'ACTIVE', 2, datetime('now'), datetime('now'))
    `).run();

    db.prepare(`
      INSERT INTO customers (id, full_name, phone_number, created_by_cashier_id, created_at, updated_at)
      VALUES ('cust_1', 'طارق علي', '01099887766', 'user_1', datetime('now'), datetime('now'))
    `).run();
  });

  afterEach(() => {
    dbService.onModuleDestroy();
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }
  });

  it('1. should create booking for registered customer and guest successfully', () => {
    const scheduledTime = new Date(Date.now() + 3600000).toISOString();

    // 1. Registered Customer
    const b1 = service.create(
      {
        customerId: 'cust_1',
        scheduledAt: scheduledTime,
        preferredEmployeeId: 'emp_1',
        internalNote: 'العميل يفضل مقعد بجوار النافذة',
      },
      'user_1',
    );

    expect(b1.id).toBeDefined();
    expect(b1.customer_id).toBe('cust_1');
    expect(b1.customer_name).toBe('طارق علي');
    expect(b1.display_client_name).toBe('طارق علي');
    expect(b1.status).toBe('CONFIRMED');

    // 2. Guest Customer
    const b2 = service.create(
      {
        guestName: 'محمد سامي',
        guestPhone: '01122334455',
        scheduledAt: scheduledTime,
      },
      'user_1',
    );

    expect(b2.id).toBeDefined();
    expect(b2.customer_id).toBeNull();
    expect(b2.guest_name).toBe('محمد سامي');
    expect(b2.display_client_name).toBe('محمد سامي');
  });

  it('2. should NOT block double booking for the same preferred barber and flag conflict indicator', () => {
    const scheduledTime = new Date(Date.now() + 7200000).toISOString();

    // Booking 1 for emp_1
    const b1 = service.create(
      {
        guestName: 'عميل 1',
        scheduledAt: scheduledTime,
        preferredEmployeeId: 'emp_1',
      },
      'user_1',
    );

    // Booking 2 for SAME emp_1 at SAME time -> MUST succeed without error (Rule 7)
    const b2 = service.create(
      {
        guestName: 'عميل 2',
        scheduledAt: scheduledTime,
        preferredEmployeeId: 'emp_1',
      },
      'user_1',
    );

    expect(b1.id).toBeDefined();
    expect(b2.id).toBeDefined();

    // Conflict detection indicator
    const allBookings = service.findAll();
    const foundB1 = allBookings.find((b) => b.id === b1.id);
    const foundB2 = allBookings.find((b) => b.id === b2.id);

    expect(foundB1?.has_conflict).toBe(true);
    expect(foundB2?.has_conflict).toBe(true);
  });

  it('3. should update booking status and reject converting already converted booking twice', () => {
    const scheduledTime = new Date(Date.now() + 3600000).toISOString();
    const b = service.create(
      {
        guestName: 'أحمد فؤاد',
        scheduledAt: scheduledTime,
      },
      'user_1',
    );

    // Mark Arrived
    const arrived = service.updateStatus(b.id, 'ARRIVED', 'user_1');
    expect(arrived.status).toBe('ARRIVED');

    // Convert to invoice
    const converted = service.updateStatus(b.id, 'CONVERTED_TO_INVOICE', 'user_1', 'inv_101');
    expect(converted.status).toBe('CONVERTED_TO_INVOICE');
    expect(converted.converted_invoice_id).toBe('inv_101');

    // Trying to convert again -> MUST throw BadRequestException
    expect(() => {
      service.updateStatus(b.id, 'CONVERTED_TO_INVOICE', 'user_1', 'inv_102');
    }).toThrow(BadRequestException);
  });
});
