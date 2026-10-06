import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { v4 as uuidv4 } from 'uuid';

export interface CustomerEntity {
  id: string;
  full_name: string;
  phone_number: string | null;
  birth_date: string | null;
  internal_note: string | null;
  created_by_cashier_id: string | null;
  created_at: string;
  updated_at: string;
  invoices_count?: number;
  total_spent?: number;
  last_visit_at?: string | null;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly auditLogService: AuditLogService,
  ) {}

  findAll(filters: { search?: string; limit: number; offset: number }): {
    customers: CustomerEntity[];
    total: number;
  } {
    const db = this.dbService.getDb();
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters.search) {
      const term = `%${filters.search.trim()}%`;
      whereClause += ' AND (c.full_name LIKE ? OR c.phone_number LIKE ?)';
      params.push(term, term);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as count FROM customers c ${whereClause}`).get(...params) as { count: number };

    const query = `
      SELECT 
        c.*,
        COUNT(i.id) as invoices_count,
        COALESCE(SUM(i.total_amount), 0) as total_spent,
        MAX(i.created_at) as last_visit_at
      FROM customers c
      LEFT JOIN invoices i ON i.customer_id = c.id AND i.status = 'PAID'
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const customers = db.prepare(query).all(...params, filters.limit, filters.offset) as CustomerEntity[];

    return {
      customers,
      total: countRow?.count || 0,
    };
  }

  findOne(id: string): CustomerEntity {
    const db = this.dbService.getDb();
    const query = `
      SELECT 
        c.*,
        COUNT(i.id) as invoices_count,
        COALESCE(SUM(i.total_amount), 0) as total_spent,
        MAX(i.created_at) as last_visit_at
      FROM customers c
      LEFT JOIN invoices i ON i.customer_id = c.id AND i.status = 'PAID'
      WHERE c.id = ?
      GROUP BY c.id
    `;
    const customer = db.prepare(query).get(id) as CustomerEntity | undefined;
    if (!customer) {
      throw new NotFoundException('العميل غير موجود');
    }
    return customer;
  }

  create(dto: CreateCustomerDto, userId: string): CustomerEntity {
    const db = this.dbService.getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO customers (id, full_name, phone_number, birth_date, internal_note, created_by_cashier_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      dto.fullName.trim(),
      dto.phoneNumber?.trim() || null,
      dto.birthDate || null,
      dto.internalNote?.trim() || null,
      userId,
      now,
      now,
    );

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'CUSTOMER_CREATED',
      entityType: 'CUSTOMER',
      entityId: id,
      afterData: { fullName: dto.fullName, phoneNumber: dto.phoneNumber },
    });

    return this.findOne(id);
  }

  update(id: string, dto: UpdateCustomerDto, userId: string): CustomerEntity {
    const existing = this.findOne(id);
    const db = this.dbService.getDb();
    const now = new Date().toISOString();

    const fullName = dto.fullName !== undefined ? dto.fullName.trim() : existing.full_name;
    const phone = dto.phoneNumber !== undefined ? dto.phoneNumber?.trim() || null : existing.phone_number;
    const birthDate = dto.birthDate !== undefined ? dto.birthDate : existing.birth_date;
    const note = dto.internalNote !== undefined ? dto.internalNote?.trim() || null : existing.internal_note;

    db.prepare(`
      UPDATE customers 
      SET full_name = ?, phone_number = ?, birth_date = ?, internal_note = ?, updated_at = ?
      WHERE id = ?
    `).run(fullName, phone, birthDate, note, now, id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'CUSTOMER_UPDATED',
      entityType: 'CUSTOMER',
      entityId: id,
      afterData: { fullName, phone },
    });

    return this.findOne(id);
  }

  getCustomerHistory(id: string) {
    this.findOne(id);
    const db = this.dbService.getDb();

    const invoices = db.prepare(`
      SELECT i.*, u.name as cashier_name
      FROM invoices i
      LEFT JOIN users u ON i.cashier_id = u.id
      WHERE i.customer_id = ?
      ORDER BY i.created_at DESC
    `).all(id);

    const bookings = db.prepare(`
      SELECT b.*, e.name as preferred_employee_name
      FROM bookings b
      LEFT JOIN employees e ON b.preferred_employee_id = e.id
      WHERE b.customer_id = ?
      ORDER BY b.scheduled_at DESC
    `).all(id);

    return {
      invoices,
      bookings,
    };
  }
}
