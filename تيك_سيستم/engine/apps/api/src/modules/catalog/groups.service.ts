import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CategoriesService } from './categories.service';
import { CreateGroupDto, UpdateGroupDto } from './dto/catalog.dto';
import { v4 as uuidv4 } from 'uuid';

export interface GroupEntity {
  id: string;
  categoryId: string;
  name: string;
  status: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';
  sortOrder: number;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class GroupsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly auditLogService: AuditLogService,
    private readonly categoriesService: CategoriesService,
  ) {}

  findByCategory(categoryId: string): GroupEntity[] {
    const db = this.dbService.getDb();
    const rows = db.prepare(`
      SELECT 
        g.id, g.category_id as categoryId, g.name, g.status, g.sort_order as sortOrder,
        g.created_at as createdAt, g.updated_at as updatedAt,
        (SELECT COUNT(*) FROM catalog_items ci WHERE ci.group_id = g.id) as itemCount
      FROM groups g
      WHERE g.category_id = ?
      ORDER BY g.sort_order ASC, g.created_at ASC
    `).all(categoryId) as any[];

    return rows.map((r) => ({
      ...r,
      sortOrder: Number(r.sortOrder),
      itemCount: Number(r.itemCount),
    }));
  }

  findById(id: string): GroupEntity {
    const db = this.dbService.getDb();
    const row = db.prepare(`
      SELECT 
        g.id, g.category_id as categoryId, g.name, g.status, g.sort_order as sortOrder,
        g.created_at as createdAt, g.updated_at as updatedAt,
        (SELECT COUNT(*) FROM catalog_items ci WHERE ci.group_id = g.id) as itemCount
      FROM groups g
      WHERE g.id = ?
    `).get(id) as any;

    if (!row) {
      throw new NotFoundException('المجموعة غير موجودة');
    }

    return {
      ...row,
      sortOrder: Number(row.sortOrder),
      itemCount: Number(row.itemCount),
    };
  }

  create(dto: CreateGroupDto, userId?: string): GroupEntity {
    const db = this.dbService.getDb();

    // Verify parent category exists
    this.categoriesService.findById(dto.categoryId);

    const id = uuidv4();
    const now = new Date().toISOString();

    const maxSort = db.prepare('SELECT MAX(sort_order) as maxSort FROM groups WHERE category_id = ?').get(dto.categoryId) as { maxSort: number | null };
    const sortOrder = dto.sortOrder ?? ((maxSort?.maxSort ?? -1) + 1);

    const stmt = db.prepare(`
      INSERT INTO groups (id, category_id, name, status, sort_order, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      dto.categoryId,
      dto.name.trim(),
      dto.status || 'ACTIVE',
      sortOrder,
      userId || null,
      now,
      now,
    );

    const created = this.findById(id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'CREATE_GROUP',
      entityType: 'GROUP',
      entityId: id,
      afterData: created,
    });

    return created;
  }

  update(id: string, dto: UpdateGroupDto, userId?: string): GroupEntity {
    const db = this.dbService.getDb();
    const existing = this.findById(id);
    const now = new Date().toISOString();

    const updatedName = dto.name !== undefined ? dto.name.trim() : existing.name;
    const updatedStatus = dto.status !== undefined ? dto.status : existing.status;
    const updatedSort = dto.sortOrder !== undefined ? dto.sortOrder : existing.sortOrder;

    const stmt = db.prepare(`
      UPDATE groups
      SET name = ?, status = ?, sort_order = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(updatedName, updatedStatus, updatedSort, now, id);

    const updated = this.findById(id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'UPDATE_GROUP',
      entityType: 'GROUP',
      entityId: id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  archive(id: string, userId?: string): GroupEntity {
    return this.update(id, { status: 'ARCHIVED' }, userId);
  }

  restore(id: string, userId?: string): GroupEntity {
    return this.update(id, { status: 'ACTIVE' }, userId);
  }

  delete(id: string, userId?: string): { success: boolean; message: string } {
    const db = this.dbService.getDb();
    const group = this.findById(id);

    const itemCountRow = db.prepare('SELECT COUNT(*) as count FROM catalog_items WHERE group_id = ?').get(id) as { count: number };
    if (itemCountRow.count > 0) {
      throw new BadRequestException('لا يمكن حذف المجموعة لأنها تحتوي على خدمات أو منتجات. يرجى أرشفتها بدلاً من الحذف.');
    }

    db.prepare('DELETE FROM groups WHERE id = ?').run(id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'DELETE_GROUP',
      entityType: 'GROUP',
      entityId: id,
      beforeData: group,
    });

    return { success: true, message: 'تم حذف المجموعة الفارغة بنجاح' };
  }

  reorder(id: string, direction: 'UP' | 'DOWN', userId?: string): GroupEntity[] {
    const db = this.dbService.getDb();
    const group = this.findById(id);
    const siblings = this.findByCategory(group.categoryId);
    const index = siblings.findIndex((g) => g.id === id);

    if (index === -1) {
      throw new NotFoundException('المجموعة غير موجودة');
    }

    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) {
      return siblings;
    }

    const current = siblings[index];
    const target = siblings[targetIndex];

    const updateStmt = db.prepare('UPDATE groups SET sort_order = ?, updated_at = ? WHERE id = ?');
    const now = new Date().toISOString();

    this.dbService.transaction(() => {
      updateStmt.run(target.sortOrder, now, current.id);
      updateStmt.run(current.sortOrder, now, target.id);
    });

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'REORDER_GROUP',
      entityType: 'GROUP',
      entityId: id,
      afterData: { direction, fromIndex: index, toIndex: targetIndex },
    });

    return this.findByCategory(group.categoryId);
  }
}
