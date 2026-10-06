import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { GroupsService } from './groups.service';
import { CreateServiceDto, CreateProductDto, UpdateItemDto } from './dto/catalog.dto';
import { v4 as uuidv4 } from 'uuid';

export interface CatalogItemEntity {
  id: string;
  groupId: string;
  type: 'SERVICE' | 'PRODUCT';
  name: string;
  price: number;
  sku?: string;
  allowPriceOverride?: boolean;
  status: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';
  sortOrder: number;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ItemsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly auditLogService: AuditLogService,
    private readonly groupsService: GroupsService,
  ) {}

  findAll(): CatalogItemEntity[] {
    const db = this.dbService.getDb();
    const rows = db.prepare(`
      SELECT 
        ci.id, ci.group_id as groupId, ci.type, ci.name, ci.base_price as price,
        ci.sku, ci.allow_price_override as allowPriceOverride, ci.status,
        ci.sort_order as sortOrder, ci.internal_note as internalNotes,
        ci.created_at as createdAt, ci.updated_at as updatedAt
      FROM catalog_items ci
      ORDER BY ci.sort_order ASC, ci.created_at ASC
    `).all() as any[];

    return rows.map((r) => ({
      ...r,
      price: Number(r.price),
      sortOrder: Number(r.sortOrder),
      allowPriceOverride: Boolean(r.allowPriceOverride),
    }));
  }

  findByGroup(groupId: string): CatalogItemEntity[] {
    const db = this.dbService.getDb();
    const rows = db.prepare(`
      SELECT 
        ci.id, ci.group_id as groupId, ci.type, ci.name, ci.base_price as price,
        ci.sku, ci.allow_price_override as allowPriceOverride, ci.status,
        ci.sort_order as sortOrder, ci.internal_note as internalNotes,
        ci.created_at as createdAt, ci.updated_at as updatedAt
      FROM catalog_items ci
      WHERE ci.group_id = ?
      ORDER BY ci.sort_order ASC, ci.created_at ASC
    `).all(groupId) as any[];

    return rows.map((r) => ({
      ...r,
      price: Number(r.price),
      sortOrder: Number(r.sortOrder),
      allowPriceOverride: Boolean(r.allowPriceOverride),
    }));
  }

  findById(id: string): CatalogItemEntity {
    const db = this.dbService.getDb();
    const row = db.prepare(`
      SELECT 
        ci.id, ci.group_id as groupId, ci.type, ci.name, ci.base_price as price,
        ci.sku, ci.allow_price_override as allowPriceOverride, ci.status,
        ci.sort_order as sortOrder, ci.internal_note as internalNotes,
        ci.created_at as createdAt, ci.updated_at as updatedAt
      FROM catalog_items ci
      WHERE ci.id = ?
    `).get(id) as any;

    if (!row) {
      throw new NotFoundException('الخدمة أو المنتج غير موجود');
    }

    return {
      ...row,
      price: Number(row.price),
      sortOrder: Number(row.sortOrder),
      allowPriceOverride: Boolean(row.allowPriceOverride),
    };
  }

  createService(dto: CreateServiceDto, userId?: string): CatalogItemEntity {
    const db = this.dbService.getDb();

    // Verify parent group exists
    this.groupsService.findById(dto.groupId);

    const id = uuidv4();
    const now = new Date().toISOString();

    const maxSort = db.prepare('SELECT MAX(sort_order) as maxSort FROM catalog_items WHERE group_id = ?').get(dto.groupId) as { maxSort: number | null };
    const sortOrder = dto.sortOrder ?? ((maxSort?.maxSort ?? -1) + 1);

    const stmt = db.prepare(`
      INSERT INTO catalog_items (
        id, group_id, type, name, base_price, sku, allow_price_override, status, sort_order, internal_note, created_by, created_at, updated_at
      ) VALUES (?, ?, 'SERVICE', ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      dto.groupId,
      dto.name.trim(),
      dto.price,
      dto.allowPriceOverride ? 1 : 0,
      dto.status || 'ACTIVE',
      sortOrder,
      dto.internalNotes?.trim() || null,
      userId || null,
      now,
      now,
    );

    const created = this.findById(id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'CREATE_SERVICE',
      entityType: 'CATALOG_ITEM',
      entityId: id,
      afterData: created,
    });

    return created;
  }

  createProduct(dto: CreateProductDto, userId?: string): CatalogItemEntity {
    const db = this.dbService.getDb();

    // Verify parent group exists
    this.groupsService.findById(dto.groupId);

    const id = uuidv4();
    const now = new Date().toISOString();

    const maxSort = db.prepare('SELECT MAX(sort_order) as maxSort FROM catalog_items WHERE group_id = ?').get(dto.groupId) as { maxSort: number | null };
    const sortOrder = dto.sortOrder ?? ((maxSort?.maxSort ?? -1) + 1);

    const stmt = db.prepare(`
      INSERT INTO catalog_items (
        id, group_id, type, name, base_price, sku, allow_price_override, status, sort_order, internal_note, created_by, created_at, updated_at
      ) VALUES (?, ?, 'PRODUCT', ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      dto.groupId,
      dto.name.trim(),
      dto.price,
      dto.sku?.trim() || null,
      dto.status || 'ACTIVE',
      sortOrder,
      dto.internalNotes?.trim() || null,
      userId || null,
      now,
      now,
    );

    const created = this.findById(id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'CREATE_PRODUCT',
      entityType: 'CATALOG_ITEM',
      entityId: id,
      afterData: created,
    });

    return created;
  }

  update(id: string, dto: UpdateItemDto, userId?: string): CatalogItemEntity {
    const db = this.dbService.getDb();
    const existing = this.findById(id);
    const now = new Date().toISOString();

    const updatedName = dto.name !== undefined ? dto.name.trim() : existing.name;
    const updatedPrice = dto.price !== undefined ? dto.price : existing.price;
    const updatedSku = dto.sku !== undefined ? dto.sku.trim() || null : existing.sku;
    const updatedOverride = dto.allowPriceOverride !== undefined ? (dto.allowPriceOverride ? 1 : 0) : (existing.allowPriceOverride ? 1 : 0);
    const updatedStatus = dto.status !== undefined ? dto.status : existing.status;
    const updatedSort = dto.sortOrder !== undefined ? dto.sortOrder : existing.sortOrder;
    const updatedNotes = dto.internalNotes !== undefined ? dto.internalNotes.trim() || null : existing.internalNotes;

    const stmt = db.prepare(`
      UPDATE catalog_items
      SET name = ?, base_price = ?, sku = ?, allow_price_override = ?, status = ?, sort_order = ?, internal_note = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(updatedName, updatedPrice, updatedSku, updatedOverride, updatedStatus, updatedSort, updatedNotes, now, id);

    const updated = this.findById(id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'UPDATE_CATALOG_ITEM',
      entityType: 'CATALOG_ITEM',
      entityId: id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  archive(id: string, userId?: string): CatalogItemEntity {
    return this.update(id, { status: 'ARCHIVED' }, userId);
  }

  restore(id: string, userId?: string): CatalogItemEntity {
    return this.update(id, { status: 'ACTIVE' }, userId);
  }

  delete(id: string, userId?: string): { success: boolean; message: string } {
    const db = this.dbService.getDb();
    const item = this.findById(id);

    db.prepare('DELETE FROM catalog_items WHERE id = ?').run(id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'DELETE_CATALOG_ITEM',
      entityType: 'CATALOG_ITEM',
      entityId: id,
      beforeData: item,
    });

    return { success: true, message: 'تم حذف العنصر بنجاح' };
  }

  reorder(id: string, direction: 'UP' | 'DOWN', userId?: string): CatalogItemEntity[] {
    const db = this.dbService.getDb();
    const item = this.findById(id);
    const siblings = this.findByGroup(item.groupId);
    const index = siblings.findIndex((i) => i.id === id);

    if (index === -1) {
      throw new NotFoundException('العنصر غير موجود');
    }

    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) {
      return siblings;
    }

    const current = siblings[index];
    const target = siblings[targetIndex];

    const updateStmt = db.prepare('UPDATE catalog_items SET sort_order = ?, updated_at = ? WHERE id = ?');
    const now = new Date().toISOString();

    this.dbService.transaction(() => {
      updateStmt.run(target.sortOrder, now, current.id);
      updateStmt.run(current.sortOrder, now, target.id);
    });

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'REORDER_CATALOG_ITEM',
      entityType: 'CATALOG_ITEM',
      entityId: id,
      afterData: { direction, fromIndex: index, toIndex: targetIndex },
    });

    return this.findByGroup(item.groupId);
  }
}
