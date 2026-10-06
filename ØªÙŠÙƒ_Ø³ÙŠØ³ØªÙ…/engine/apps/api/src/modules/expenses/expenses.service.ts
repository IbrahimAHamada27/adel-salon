import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { v4 as uuidv4 } from 'uuid';

export interface ExpenseEntity {
  id: string;
  shift_id: string | null;
  cashier_id: string;
  cashier_name?: string | null;
  category: string;
  amount: number;
  description: string | null;
  created_at: string;
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly auditLogService: AuditLogService,
  ) {}

  findAll(filters: {
    category?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    limit: number;
    offset: number;
  }): { expenses: ExpenseEntity[]; total: number; summary: { totalSpent: number; totalCount: number; categoriesCount: number } } {
    const db = this.dbService.getDb();
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters.category && filters.category !== 'ALL') {
      whereClause += ' AND e.category = ?';
      params.push(filters.category);
    }

    if (filters.startDate) {
      whereClause += ' AND date(e.created_at) >= date(?)';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      whereClause += ' AND date(e.created_at) <= date(?)';
      params.push(filters.endDate);
    }

    if (filters.search) {
      const term = `%${filters.search.trim()}%`;
      whereClause += ' AND (e.category LIKE ? OR e.description LIKE ?)';
      params.push(term, term);
    }

    const countRow = db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(e.amount), 0) as total_spent,
        COUNT(DISTINCT e.category) as categories_count
      FROM expenses e
      ${whereClause}
    `).get(...params) as { total_count: number; total_spent: number; categories_count: number };

    const query = `
      SELECT e.*, u.name as cashier_name
      FROM expenses e
      LEFT JOIN users u ON e.cashier_id = u.id
      ${whereClause}
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const expenses = db.prepare(query).all(...params, filters.limit, filters.offset) as ExpenseEntity[];

    return {
      expenses,
      total: countRow?.total_count || 0,
      summary: {
        totalSpent: countRow?.total_spent || 0,
        totalCount: countRow?.total_count || 0,
        categoriesCount: countRow?.categories_count || 0,
      },
    };
  }

  create(dto: CreateExpenseDto, userId: string): ExpenseEntity {
    if (dto.amount === undefined || dto.amount === null || dto.amount <= 0) {
      throw new BadRequestException('مبلغ المصروف يجب أن يكون أكبر من الصفر');
    }
    const db = this.dbService.getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO expenses (id, shift_id, cashier_id, category, amount, description, created_at)
      VALUES (?, NULL, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      dto.category.trim(),
      dto.amount,
      dto.description?.trim() || null,
      now,
    );

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'EXPENSE_RECORDED',
      entityType: 'EXPENSE',
      entityId: id,
      afterData: { category: dto.category, amount: dto.amount, description: dto.description },
    });

    return {
      id,
      shift_id: null,
      cashier_id: userId,
      category: dto.category.trim(),
      amount: dto.amount,
      description: dto.description?.trim() || null,
      created_at: now,
    };
  }

  getCategories(): string[] {
    const db = this.dbService.getDb();
    const rows = db.prepare(`SELECT DISTINCT category FROM expenses ORDER BY category ASC`).all() as { category: string }[];
    const defaultCategories = ['ضيافة ومشروبات', 'أدوات نظافة وتعقيم', 'مستلزمات صالون', 'صيانة وتشغيل', 'كهرباء ومياه', 'أخرى'];
    const dbCategories = rows.map((r) => r.category);
    return Array.from(new Set([...defaultCategories, ...dbCategories]));
  }
}
