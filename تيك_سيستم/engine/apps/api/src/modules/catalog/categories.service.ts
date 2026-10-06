import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/catalog.dto';
import { v4 as uuidv4 } from 'uuid';

export interface CategoryEntity {
  id: string;
  name: string;
  colorCode?: string;
  icon?: string;
  status: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';
  sortOrder: number;
  groupCount?: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class CategoriesService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly auditLogService: AuditLogService,
  ) {}

  findAll(): CategoryEntity[] {
    const db = this.dbService.getDb();
    const rows = db.prepare(`
      SELECT 
        c.id, c.name, c.color_code as colorCode, c.icon, c.status, c.sort_order as sortOrder,
        c.created_at as createdAt, c.updated_at as updatedAt,
        (SELECT COUNT(*) FROM groups g WHERE g.category_id = c.id) as groupCount
      FROM categories c
      ORDER BY c.sort_order ASC, c.created_at ASC
    `).all() as any[];

    return rows.map((r) => ({
      ...r,
      sortOrder: Number(r.sortOrder),
      groupCount: Number(r.groupCount),
    }));
  }

  findById(id: string): CategoryEntity {
    const db = this.dbService.getDb();
    const row = db.prepare(`
      SELECT 
        c.id, c.name, c.color_code as colorCode, c.icon, c.status, c.sort_order as sortOrder,
        c.created_at as createdAt, c.updated_at as updatedAt,
        (SELECT COUNT(*) FROM groups g WHERE g.category_id = c.id) as groupCount
      FROM categories c
      WHERE c.id = ?
    `).get(id) as any;

    if (!row) {
      throw new NotFoundException('القسم غير موجود');
    }

    return {
      ...row,
      sortOrder: Number(row.sortOrder),
      groupCount: Number(row.groupCount),
    };
  }

  create(dto: CreateCategoryDto, userId?: string): CategoryEntity {
    const db = this.dbService.getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    const maxSort = db.prepare('SELECT MAX(sort_order) as maxSort FROM categories').get() as { maxSort: number | null };
    const sortOrder = dto.sortOrder ?? ((maxSort?.maxSort ?? -1) + 1);

    const stmt = db.prepare(`
      INSERT INTO categories (id, name, color_code, icon, status, sort_order, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      dto.name.trim(),
      dto.colorCode || '#059669',
      dto.icon || null,
      dto.status || 'ACTIVE',
      sortOrder,
      userId || null,
      now,
      now,
    );

    const created = this.findById(id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'CREATE_CATEGORY',
      entityType: 'CATEGORY',
      entityId: id,
      afterData: created,
    });

    return created;
  }

  update(id: string, dto: UpdateCategoryDto, userId?: string): CategoryEntity {
    const db = this.dbService.getDb();
    const existing = this.findById(id);
    const now = new Date().toISOString();

    const updatedName = dto.name !== undefined ? dto.name.trim() : existing.name;
    const updatedColor = dto.colorCode !== undefined ? dto.colorCode : existing.colorCode;
    const updatedIcon = dto.icon !== undefined ? dto.icon : existing.icon;
    const updatedStatus = dto.status !== undefined ? dto.status : existing.status;
    const updatedSort = dto.sortOrder !== undefined ? dto.sortOrder : existing.sortOrder;

    const stmt = db.prepare(`
      UPDATE categories
      SET name = ?, color_code = ?, icon = ?, status = ?, sort_order = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(updatedName, updatedColor || null, updatedIcon || null, updatedStatus, updatedSort, now, id);

    const updated = this.findById(id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'UPDATE_CATEGORY',
      entityType: 'CATEGORY',
      entityId: id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  archive(id: string, userId?: string): CategoryEntity {
    return this.update(id, { status: 'ARCHIVED' }, userId);
  }

  restore(id: string, userId?: string): CategoryEntity {
    return this.update(id, { status: 'ACTIVE' }, userId);
  }

  delete(id: string, userId?: string): { success: boolean; message: string } {
    const db = this.dbService.getDb();
    const category = this.findById(id);

    const groupCountRow = db.prepare('SELECT COUNT(*) as count FROM groups WHERE category_id = ?').get(id) as { count: number };
    if (groupCountRow.count > 0) {
      throw new BadRequestException('لا يمكن حذف القسم لأنه يحتوي على مجموعات تابعة. يرجى أرشفته بدلاً من الحذف.');
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'DELETE_CATEGORY',
      entityType: 'CATEGORY',
      entityId: id,
      beforeData: category,
    });

    return { success: true, message: 'تم حذف القسم الفارغ بنجاح' };
  }

  reorder(id: string, direction: 'UP' | 'DOWN', userId?: string): CategoryEntity[] {
    const db = this.dbService.getDb();
    const all = this.findAll();
    const index = all.findIndex((c) => c.id === id);

    if (index === -1) {
      throw new NotFoundException('القسم غير موجود');
    }

    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= all.length) {
      return all; // Already at boundary
    }

    const current = all[index];
    const target = all[targetIndex];

    const updateStmt = db.prepare('UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ?');
    const now = new Date().toISOString();

    this.dbService.transaction(() => {
      updateStmt.run(target.sortOrder, now, current.id);
      updateStmt.run(current.sortOrder, now, target.id);
    });

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'REORDER_CATEGORY',
      entityType: 'CATEGORY',
      entityId: id,
      afterData: { direction, fromIndex: index, toIndex: targetIndex },
    });

    return this.findAll();
  }
}
