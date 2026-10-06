import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface InvoiceLineDto {
  id: string;
  invoice_id: string;
  catalog_item_id: string | null;
  item_name_snapshot: string;
  item_type: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  barber_employee_id: string | null;
  barber_name?: string | null;
  parent_promotion_id: string | null;
}

export interface InvoiceDetailsDto {
  id: string;
  shift_id: string | null;
  cashier_id: string;
  cashier_name?: string | null;
  customer_id: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  invoice_number: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  lines: InvoiceLineDto[];
}

@Injectable()
export class SalesService {
  constructor(private readonly dbService: DatabaseService) {}

  findAll(filters: {
    startDate?: string;
    endDate?: string;
    status?: string;
    paymentMethod?: string;
    search?: string;
    limit: number;
    offset: number;
  }): { invoices: InvoiceDetailsDto[]; total: number; summary: { totalSales: number; totalCount: number; totalDiscount: number } } {
    const db = this.dbService.getDb();
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters.status && filters.status !== 'ALL') {
      whereClause += ' AND i.status = ?';
      params.push(filters.status);
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'ALL') {
      whereClause += ' AND i.payment_method = ?';
      params.push(filters.paymentMethod);
    }

    if (filters.startDate) {
      whereClause += ' AND date(i.created_at) >= date(?)';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      whereClause += ' AND date(i.created_at) <= date(?)';
      params.push(filters.endDate);
    }

    if (filters.search) {
      const term = `%${filters.search.trim()}%`;
      whereClause += ' AND (i.invoice_number LIKE ? OR c.full_name LIKE ? OR c.phone_number LIKE ?)';
      params.push(term, term, term);
    }

    const countRow = db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(i.total_amount), 0) as total_sales,
        COALESCE(SUM(i.discount_amount), 0) as total_discount
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      ${whereClause}
    `).get(...params) as { total_count: number; total_sales: number; total_discount: number };

    const query = `
      SELECT 
        i.*,
        c.full_name as customer_name,
        c.phone_number as customer_phone,
        u.name as cashier_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN users u ON i.cashier_id = u.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const invoiceRows = db.prepare(query).all(...params, filters.limit, filters.offset) as any[];

    const invoices = invoiceRows.map((inv) => {
      const lines = db.prepare(`
        SELECT l.*, e.name as barber_name
        FROM invoice_lines l
        LEFT JOIN employees e ON l.barber_employee_id = e.id
        WHERE l.invoice_id = ?
        ORDER BY l.sort_order ASC
      `).all(inv.id) as InvoiceLineDto[];

      return {
        ...inv,
        lines,
      };
    });

    return {
      invoices,
      total: countRow?.total_count || 0,
      summary: {
        totalSales: countRow?.total_sales || 0,
        totalCount: countRow?.total_count || 0,
        totalDiscount: countRow?.total_discount || 0,
      },
    };
  }

  findOne(id: string): InvoiceDetailsDto {
    const db = this.dbService.getDb();
    const inv = db.prepare(`
      SELECT 
        i.*,
        c.full_name as customer_name,
        c.phone_number as customer_phone,
        u.name as cashier_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN users u ON i.cashier_id = u.id
      WHERE i.id = ?
    `).get(id) as any;

    if (!inv) {
      throw new NotFoundException('الفاتورة غير موجودة');
    }

    const lines = db.prepare(`
      SELECT l.*, e.name as barber_name
      FROM invoice_lines l
      LEFT JOIN employees e ON l.barber_employee_id = e.id
      WHERE l.invoice_id = ?
      ORDER BY l.sort_order ASC
    `).all(id) as InvoiceLineDto[];

    return {
      ...inv,
      lines,
    };
  }
}
