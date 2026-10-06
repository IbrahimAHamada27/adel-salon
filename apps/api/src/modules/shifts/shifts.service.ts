import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface ShiftDetailsDto {
  id: string;
  cashier_id: string;
  cashier_name?: string | null;
  status: 'OPEN' | 'CLOSED';
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  expected_cash: number;
  actual_cash: number | null;
  cash_difference: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  total_sales?: number;
  cash_sales?: number;
  card_sales?: number;
  invoices_count?: number;
  total_expenses?: number;
}

@Injectable()
export class ShiftsService {
  constructor(private readonly dbService: DatabaseService) {}

  findAll(filters: {
    status?: string;
    startDate?: string;
    endDate?: string;
    limit: number;
    offset: number;
  }): { shifts: ShiftDetailsDto[]; total: number; summary: { totalCount: number; openCount: number; closedCount: number } } {
    const db = this.dbService.getDb();
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters.status && filters.status !== 'ALL') {
      whereClause += ' AND s.status = ?';
      params.push(filters.status);
    }

    if (filters.startDate) {
      whereClause += ' AND date(s.opened_at) >= date(?)';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      whereClause += ' AND date(s.opened_at) <= date(?)';
      params.push(filters.endDate);
    }

    const countRow = db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed_count
      FROM shifts s
      ${whereClause}
    `).get(...params) as { total_count: number; open_count: number; closed_count: number };

    const query = `
      SELECT s.*, u.name as cashier_name
      FROM shifts s
      LEFT JOIN users u ON s.cashier_id = u.id
      ${whereClause}
      ORDER BY s.opened_at DESC
      LIMIT ? OFFSET ?
    `;

    const shiftRows = db.prepare(query).all(...params, filters.limit, filters.offset) as any[];

    const shifts = shiftRows.map((s) => {
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as invoices_count,
          COALESCE(SUM(total_amount), 0) as total_sales,
          COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount ELSE 0 END), 0) as cash_sales,
          COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN total_amount ELSE 0 END), 0) as card_sales
        FROM invoices
        WHERE shift_id = ? AND status = 'PAID'
      `).get(s.id) as any;

      const expStats = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses
        WHERE shift_id = ?
      `).get(s.id) as any;

      return {
        ...s,
        total_sales: stats?.total_sales || 0,
        cash_sales: stats?.cash_sales || 0,
        card_sales: stats?.card_sales || 0,
        invoices_count: stats?.invoices_count || 0,
        total_expenses: expStats?.total_expenses || 0,
      };
    });

    return {
      shifts,
      total: countRow?.total_count || 0,
      summary: {
        totalCount: countRow?.total_count || 0,
        openCount: countRow?.open_count || 0,
        closedCount: countRow?.closed_count || 0,
      },
    };
  }

  findOne(id: string): ShiftDetailsDto {
    const db = this.dbService.getDb();
    const s = db.prepare(`
      SELECT s.*, u.name as cashier_name
      FROM shifts s
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE s.id = ?
    `).get(id) as any;

    if (!s) {
      throw new NotFoundException('الوردية غير موجودة');
    }

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as invoices_count,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN total_amount ELSE 0 END), 0) as card_sales
      FROM invoices
      WHERE shift_id = ? AND status = 'PAID'
    `).get(id) as any;

    const expStats = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE shift_id = ?
    `).get(id) as any;

    return {
      ...s,
      total_sales: stats?.total_sales || 0,
      cash_sales: stats?.cash_sales || 0,
      card_sales: stats?.card_sales || 0,
      invoices_count: stats?.invoices_count || 0,
      total_expenses: expStats?.total_expenses || 0,
    };
  }
}
