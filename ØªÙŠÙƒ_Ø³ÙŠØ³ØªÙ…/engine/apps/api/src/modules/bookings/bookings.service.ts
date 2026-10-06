import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { v4 as uuidv4 } from 'uuid';

export interface BookingItemEntity {
  id: string;
  booking_id: string;
  catalog_item_id: string | null;
  promotion_id: string | null;
  item_name_snapshot: string;
  item_type: 'SERVICE' | 'PRODUCT' | 'PROMOTION';
  quantity: number;
  sort_order: number;
}

export interface BookingEntity {
  id: string;
  customer_id: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  display_client_name: string;
  display_client_phone: string | null;
  scheduled_at: string;
  status: 'CONFIRMED' | 'ARRIVED' | 'NO_SHOW' | 'CANCELLED' | 'CONVERTED_TO_INVOICE';
  preferred_employee_id: string | null;
  preferred_employee_name?: string | null;
  has_conflict?: boolean;
  internal_note: string | null;
  created_by_user_id: string;
  created_from: 'ADMIN' | 'CASHIER';
  converted_invoice_id: string | null;
  created_at: string;
  updated_at: string;
  items: BookingItemEntity[];
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly dbService: DatabaseService,
    private readonly auditLogService: AuditLogService,
  ) {}

  create(dto: CreateBookingDto, userId: string): BookingEntity {
    if (!dto.scheduledAt) {
      throw new BadRequestException('موعد وتاريخ الحجز إلزامي');
    }

    const scheduledDate = new Date(dto.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('تنسيق موعد وتاريخ الحجز غير صالح');
    }

    const db = this.dbService.getDb();
    let finalCustomerId = dto.customerId || null;

    // Handle create new customer on the fly if requested
    if (!finalCustomerId && dto.newCustomer && dto.newCustomer.fullName?.trim()) {
      finalCustomerId = uuidv4();
      const nowCust = new Date().toISOString();
      db.prepare(`
        INSERT INTO customers (
          id, full_name, phone_number, birth_date, internal_note, created_by_cashier_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        finalCustomerId,
        dto.newCustomer.fullName.trim(),
        dto.newCustomer.phoneNumber?.trim() || null,
        dto.newCustomer.birthDate || null,
        dto.newCustomer.internalNote?.trim() || null,
        userId,
        nowCust,
        nowCust,
      );
    }

    // Guest validation if no customer
    let guestName = dto.guestName?.trim() || null;
    let guestPhone = dto.guestPhone?.trim() || null;

    if (!finalCustomerId && !guestName) {
      guestName = 'عميل ضيف';
    }

    // Validate preferred employee if provided
    let preferredEmpId = dto.preferredEmployeeId || null;
    if (preferredEmpId) {
      const emp = db.prepare(`SELECT id FROM employees WHERE id = ?`).get(preferredEmpId);
      if (!emp) preferredEmpId = null;
    }

    const bookingId = uuidv4();
    const now = new Date().toISOString();
    const status = dto.status || 'CONFIRMED';
    const createdFrom = dto.createdFrom || 'ADMIN';

    return this.dbService.transaction(() => {
      db.prepare(`
        INSERT INTO bookings (
          id, customer_id, guest_name, guest_phone, scheduled_at, status, preferred_employee_id,
          internal_note, created_by_user_id, created_from, converted_invoice_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bookingId,
        finalCustomerId,
        guestName,
        guestPhone,
        scheduledDate.toISOString(),
        status,
        preferredEmpId,
        dto.internalNote?.trim() || null,
        userId,
        createdFrom,
        null,
        now,
        now,
      );

      // Insert Booking Items if specified
      if (dto.items && dto.items.length > 0) {
        const itemStmt = db.prepare(`
          INSERT INTO booking_items (
            id, booking_id, catalog_item_id, promotion_id, item_name_snapshot, item_type, quantity, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (let idx = 0; idx < dto.items.length; idx++) {
          const itm = dto.items[idx];
          let nameSnapshot = 'بند حجز';
          let itemType: 'SERVICE' | 'PRODUCT' | 'PROMOTION' = itm.itemType || 'SERVICE';

          if (itm.catalogItemId) {
            const catItem = db
              .prepare(`SELECT name, type FROM catalog_items WHERE id = ?`)
              .get(itm.catalogItemId) as any;
            if (catItem) {
              nameSnapshot = catItem.name;
              itemType = catItem.type;
            }
          } else if (itm.promotionId) {
            const promo = db.prepare(`SELECT name FROM promotions WHERE id = ?`).get(itm.promotionId) as any;
            if (promo) {
              nameSnapshot = `عرض: ${promo.name}`;
              itemType = 'PROMOTION';
            }
          }

          itemStmt.run(
            uuidv4(),
            bookingId,
            itm.catalogItemId || null,
            itm.promotionId || null,
            nameSnapshot,
            itemType,
            itm.quantity && itm.quantity > 0 ? itm.quantity : 1,
            itm.sortOrder !== undefined ? itm.sortOrder : idx,
          );
        }
      }

      this.auditLogService.logEvent({
        actorUserId: userId,
        action: 'BOOKING_CREATED',
        entityType: 'AUTH',
        entityId: bookingId,
        afterData: {
          client: finalCustomerId ? `Customer:${finalCustomerId}` : guestName,
          scheduledAt: dto.scheduledAt,
          status,
          createdFrom,
        },
      });

      return this.findOne(bookingId);
    });
  }

  findAll(filters?: {
    datePreset?: 'TODAY' | 'TOMORROW' | 'CUSTOM' | 'ALL';
    startDate?: string;
    endDate?: string;
    status?: string;
    employeeId?: string;
    search?: string;
  }): BookingEntity[] {
    const db = this.dbService.getDb();
    let query = `
      SELECT b.*,
             c.full_name as customer_name, c.phone_number as customer_phone,
             e.name as preferred_employee_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN employees e ON b.preferred_employee_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status) {
      query += ` AND b.status = ?`;
      params.push(filters.status);
    }

    if (filters?.employeeId) {
      query += ` AND b.preferred_employee_id = ?`;
      params.push(filters.employeeId);
    }

    if (filters?.search) {
      const term = `%${filters.search.trim()}%`;
      query += ` AND (c.full_name LIKE ? OR c.phone_number LIKE ? OR b.guest_name LIKE ? OR b.guest_phone LIKE ?)`;
      params.push(term, term, term, term);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (filters?.datePreset === 'TODAY') {
      query += ` AND date(b.scheduled_at) = ?`;
      params.push(todayStr);
    } else if (filters?.datePreset === 'TOMORROW') {
      query += ` AND date(b.scheduled_at) = ?`;
      params.push(tomorrowStr);
    } else if (filters?.startDate || filters?.endDate) {
      if (filters.startDate) {
        query += ` AND b.scheduled_at >= ?`;
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        query += ` AND b.scheduled_at <= ?`;
        params.push(filters.endDate);
      }
    }

    query += ` ORDER BY b.scheduled_at ASC`;

    const rows = db.prepare(query).all(...params) as any[];

    // Calculate conflict indicator (same preferred employee with overlapping +- 30m window)
    const bookings = rows.map((r) => this.populateBookingItems(r));
    return this.detectConflicts(bookings);
  }

  findOne(id: string): BookingEntity {
    const db = this.dbService.getDb();
    const row = db
      .prepare(`
        SELECT b.*,
               c.full_name as customer_name, c.phone_number as customer_phone,
               e.name as preferred_employee_name
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id
        LEFT JOIN employees e ON b.preferred_employee_id = e.id
        WHERE b.id = ?
      `)
      .get(id) as any;

    if (!row) {
      throw new NotFoundException('الحجز غير موجود');
    }

    return this.populateBookingItems(row);
  }

  update(id: string, dto: UpdateBookingDto, userId: string): BookingEntity {
    const existing = this.findOne(id);
    const db = this.dbService.getDb();
    const now = new Date().toISOString();

    return this.dbService.transaction(() => {
      db.prepare(`
        UPDATE bookings
        SET customer_id = ?, guest_name = ?, guest_phone = ?, scheduled_at = ?, status = ?,
            preferred_employee_id = ?, internal_note = ?, converted_invoice_id = ?, updated_at = ?
        WHERE id = ?
      `).run(
        dto.customerId !== undefined ? dto.customerId : existing.customer_id,
        dto.guestName !== undefined ? dto.guestName?.trim() || null : existing.guest_name,
        dto.guestPhone !== undefined ? dto.guestPhone?.trim() || null : existing.guest_phone,
        dto.scheduledAt || existing.scheduled_at,
        dto.status || existing.status,
        dto.preferredEmployeeId !== undefined ? dto.preferredEmployeeId : existing.preferred_employee_id,
        dto.internalNote !== undefined ? dto.internalNote?.trim() || null : existing.internal_note,
        dto.convertedInvoiceId !== undefined ? dto.convertedInvoiceId : existing.converted_invoice_id,
        now,
        id,
      );

      if (dto.items && dto.items.length >= 0) {
        db.prepare(`DELETE FROM booking_items WHERE booking_id = ?`).run(id);

        const itemStmt = db.prepare(`
          INSERT INTO booking_items (
            id, booking_id, catalog_item_id, promotion_id, item_name_snapshot, item_type, quantity, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (let idx = 0; idx < dto.items.length; idx++) {
          const itm = dto.items[idx];
          let nameSnapshot = 'بند حجز';
          let itemType: 'SERVICE' | 'PRODUCT' | 'PROMOTION' = itm.itemType || 'SERVICE';

          if (itm.catalogItemId) {
            const catItem = db
              .prepare(`SELECT name, type FROM catalog_items WHERE id = ?`)
              .get(itm.catalogItemId) as any;
            if (catItem) {
              nameSnapshot = catItem.name;
              itemType = catItem.type;
            }
          } else if (itm.promotionId) {
            const promo = db.prepare(`SELECT name FROM promotions WHERE id = ?`).get(itm.promotionId) as any;
            if (promo) {
              nameSnapshot = `عرض: ${promo.name}`;
              itemType = 'PROMOTION';
            }
          }

          itemStmt.run(
            uuidv4(),
            id,
            itm.catalogItemId || null,
            itm.promotionId || null,
            nameSnapshot,
            itemType,
            itm.quantity && itm.quantity > 0 ? itm.quantity : 1,
            itm.sortOrder !== undefined ? itm.sortOrder : idx,
          );
        }
      }

      this.auditLogService.logEvent({
        actorUserId: userId,
        action: 'BOOKING_UPDATED',
        entityType: 'AUTH',
        entityId: id,
        beforeData: existing,
        afterData: { status: dto.status, scheduledAt: dto.scheduledAt },
      });

      return this.findOne(id);
    });
  }

  updateStatus(
    id: string,
    status: 'CONFIRMED' | 'ARRIVED' | 'NO_SHOW' | 'CANCELLED' | 'CONVERTED_TO_INVOICE',
    userId: string,
    convertedInvoiceId?: string,
  ): BookingEntity {
    const existing = this.findOne(id);

    // Business rule: CONVERTED_TO_INVOICE cannot be converted again
    if (existing.status === 'CONVERTED_TO_INVOICE' && status === 'CONVERTED_TO_INVOICE') {
      throw new BadRequestException('تم تحويل هذا الحجز إلى فاتورة بالفعل ولا يمكن تحويله مرة أخرى');
    }

    const db = this.dbService.getDb();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE bookings
      SET status = ?, converted_invoice_id = COALESCE(?, converted_invoice_id), updated_at = ?
      WHERE id = ?
    `).run(status, convertedInvoiceId || null, now, id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: `BOOKING_STATUS_${status}`,
      entityType: 'AUTH',
      entityId: id,
      beforeData: { status: existing.status },
      afterData: { status, convertedInvoiceId },
    });

    return this.findOne(id);
  }

  // Cashier Upcoming Bookings Retrieval
  getUpcomingForCashier(): BookingEntity[] {
    const db = this.dbService.getDb();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const rows = db
      .prepare(`
        SELECT b.*,
               c.full_name as customer_name, c.phone_number as customer_phone,
               e.name as preferred_employee_name
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id
        LEFT JOIN employees e ON b.preferred_employee_id = e.id
        WHERE b.scheduled_at >= ?
          AND b.status IN ('CONFIRMED', 'ARRIVED')
        ORDER BY b.scheduled_at ASC
        LIMIT 50
      `)
      .all(todayStart.toISOString()) as any[];

    return rows.map((r) => this.populateBookingItems(r));
  }

  private populateBookingItems(row: any): BookingEntity {
    const db = this.dbService.getDb();
    const itemsRaw = db.prepare(`SELECT * FROM booking_items WHERE booking_id = ? ORDER BY sort_order ASC`).all(row.id) as any[];

    const displayName = row.customer_name || row.guest_name || 'عميل ضيف';
    const displayPhone = row.customer_phone || row.guest_phone || null;

    return {
      id: row.id,
      customer_id: row.customer_id,
      customer_name: row.customer_name || null,
      customer_phone: row.customer_phone || null,
      guest_name: row.guest_name || null,
      guest_phone: row.guest_phone || null,
      display_client_name: displayName,
      display_client_phone: displayPhone,
      scheduled_at: row.scheduled_at,
      status: row.status,
      preferred_employee_id: row.preferred_employee_id,
      preferred_employee_name: row.preferred_employee_name || null,
      internal_note: row.internal_note,
      created_by_user_id: row.created_by_user_id,
      created_from: row.created_from,
      converted_invoice_id: row.converted_invoice_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      items: itemsRaw.map((i) => ({
        id: i.id,
        booking_id: i.booking_id,
        catalog_item_id: i.catalog_item_id,
        promotion_id: i.promotion_id,
        item_name_snapshot: i.item_name_snapshot,
        item_type: i.item_type,
        quantity: i.quantity,
        sort_order: i.sort_order,
      })),
    };
  }

  private detectConflicts(bookings: BookingEntity[]): BookingEntity[] {
    for (let i = 0; i < bookings.length; i++) {
      const b1 = bookings[i];
      if (!b1.preferred_employee_id || b1.status === 'CANCELLED') continue;

      const t1 = new Date(b1.scheduled_at).getTime();
      let hasConflict = false;

      for (let j = 0; j < bookings.length; j++) {
        if (i === j) continue;
        const b2 = bookings[j];
        if (b2.preferred_employee_id !== b1.preferred_employee_id || b2.status === 'CANCELLED') continue;

        const t2 = new Date(b2.scheduled_at).getTime();
        // Overlap within 30 minutes
        if (Math.abs(t1 - t2) < 30 * 60 * 1000) {
          hasConflict = true;
          break;
        }
      }

      b1.has_conflict = hasConflict;
    }

    return bookings;
  }
}
