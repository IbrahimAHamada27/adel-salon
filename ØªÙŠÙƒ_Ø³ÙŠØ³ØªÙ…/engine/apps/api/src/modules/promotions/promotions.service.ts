import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { v4 as uuidv4 } from 'uuid';

export interface PromotionItemEntity {
  id: string;
  promotion_id: string;
  catalog_item_id: string;
  catalog_item_name_snapshot: string;
  catalog_item_type: 'SERVICE' | 'PRODUCT';
  quantity: number;
  sort_order: number;
  catalog_item_base_price?: number;
}

export interface PromotionEntity {
  id: string;
  name: string;
  description: string | null;
  fixed_price: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items: PromotionItemEntity[];
  original_total_price?: number;
  savings_amount?: number;
}

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    private readonly dbService: DatabaseService,
    private readonly auditLogService: AuditLogService,
  ) {}

  create(dto: CreatePromotionDto, userId: string): PromotionEntity {
    // 1. Validation
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('اسم العرض أو الباقة إلزامي');
    }

    if (dto.fixedPrice === undefined || dto.fixedPrice < 0) {
      throw new BadRequestException('سعر العرض الثابت لا يمكن أن يكون سالباً');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('يجب إضافة عنصر واحد على الأقل داخل العرض');
    }

    if (dto.startsAt && dto.endsAt) {
      if (new Date(dto.endsAt) < new Date(dto.startsAt)) {
        throw new BadRequestException('تاريخ نهاية العرض لا يمكن أن يكون قبل تاريخ البداية');
      }
    }

    const db = this.dbService.getDb();

    // 2. Validate items exist and are ACTIVE
    const validatedItems: Array<{
      catalogItemId: string;
      nameSnapshot: string;
      itemType: 'SERVICE' | 'PRODUCT';
      quantity: number;
      sortOrder: number;
      basePrice: number;
    }> = [];

    for (let idx = 0; idx < dto.items.length; idx++) {
      const itemInput = dto.items[idx];
      const catalogItem = db
        .prepare(`SELECT id, name, type, base_price, status FROM catalog_items WHERE id = ?`)
        .get(itemInput.catalogItemId) as {
        id: string;
        name: string;
        type: 'SERVICE' | 'PRODUCT';
        base_price: number;
        status: string;
      } | undefined;

      if (!catalogItem) {
        throw new BadRequestException(`عنصر الكتالوج المحدد غير موجود (معرف: ${itemInput.catalogItemId})`);
      }

      if (catalogItem.status !== 'ACTIVE') {
        throw new BadRequestException(`لا يمكن إضافة العنصر "${catalogItem.name}" لأنه غير نشط أو مؤرشف`);
      }

      const qty = itemInput.quantity && itemInput.quantity > 0 ? itemInput.quantity : 1;
      validatedItems.push({
        catalogItemId: catalogItem.id,
        nameSnapshot: catalogItem.name,
        itemType: catalogItem.type,
        quantity: qty,
        sortOrder: itemInput.sortOrder !== undefined ? itemInput.sortOrder : idx,
        basePrice: Number(catalogItem.base_price),
      });
    }

    const promoId = uuidv4();
    const now = new Date().toISOString();
    const status = dto.status || 'ACTIVE';
    const sortOrder = dto.sortOrder || 0;

    return this.dbService.transaction(() => {
      db.prepare(`
        INSERT INTO promotions (
          id, name, description, fixed_price, status, starts_at, ends_at, sort_order, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        promoId,
        name,
        dto.description?.trim() || null,
        Math.round(dto.fixedPrice * 100) / 100,
        status,
        dto.startsAt || null,
        dto.endsAt || null,
        sortOrder,
        userId,
        now,
        now,
      );

      const itemsStmt = db.prepare(`
        INSERT INTO promotion_items (
          id, promotion_id, catalog_item_id, catalog_item_name_snapshot, catalog_item_type, quantity, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of validatedItems) {
        itemsStmt.run(
          uuidv4(),
          promoId,
          item.catalogItemId,
          item.nameSnapshot,
          item.itemType,
          item.quantity,
          item.sortOrder,
        );
      }

      this.auditLogService.logEvent({
        actorUserId: userId,
        action: 'PROMOTION_CREATED',
        entityType: 'CATALOG_ITEM',
        entityId: promoId,
        afterData: {
          name,
          fixedPrice: dto.fixedPrice,
          itemsCount: validatedItems.length,
          status,
        },
      });

      return this.findOne(promoId);
    });
  }

  findAll(filters?: {
    status?: string;
    search?: string;
    filterType?: 'ALL' | 'ACTIVE_NOW' | 'EXPIRED' | 'SCHEDULED' | 'ARCHIVED';
  }): PromotionEntity[] {
    const db = this.dbService.getDb();
    let query = `
      SELECT id, name, description, fixed_price, status, starts_at, ends_at, sort_order, created_by, created_at, updated_at
      FROM promotions
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status) {
      query += ` AND status = ?`;
      params.push(filters.status);
    } else if (filters?.filterType === 'ARCHIVED') {
      query += ` AND status = 'ARCHIVED'`;
    } else if (filters?.filterType !== 'ALL') {
      query += ` AND status != 'ARCHIVED'`;
    }

    if (filters?.search) {
      query += ` AND name LIKE ?`;
      params.push(`%${filters.search.trim()}%`);
    }

    const now = new Date().toISOString();

    if (filters?.filterType === 'ACTIVE_NOW') {
      query += ` AND status = 'ACTIVE' AND (starts_at IS NULL OR starts_at <= ?) AND (ends_at IS NULL OR ends_at >= ?)`;
      params.push(now, now);
    } else if (filters?.filterType === 'EXPIRED') {
      query += ` AND ends_at IS NOT NULL AND ends_at < ?`;
      params.push(now);
    } else if (filters?.filterType === 'SCHEDULED') {
      query += ` AND starts_at IS NOT NULL AND starts_at > ?`;
      params.push(now);
    }

    query += ` ORDER BY sort_order ASC, created_at DESC`;

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => this.populatePromotionItems(r));
  }

  findOne(id: string): PromotionEntity {
    const db = this.dbService.getDb();
    const row = db.prepare(`SELECT * FROM promotions WHERE id = ?`).get(id) as any;
    if (!row) {
      throw new NotFoundException('العرض أو الباقة غير موجودة');
    }
    return this.populatePromotionItems(row);
  }

  update(id: string, dto: UpdatePromotionDto, userId: string): PromotionEntity {
    const existing = this.findOne(id);
    const db = this.dbService.getDb();

    if (dto.fixedPrice !== undefined && dto.fixedPrice < 0) {
      throw new BadRequestException('سعر العرض الثابت لا يمكن أن يكون سالباً');
    }

    const startsAt = dto.startsAt !== undefined ? dto.startsAt : existing.starts_at;
    const endsAt = dto.endsAt !== undefined ? dto.endsAt : existing.ends_at;

    if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
      throw new BadRequestException('تاريخ نهاية العرض لا يمكن أن يكون قبل تاريخ البداية');
    }

    const name = dto.name !== undefined ? dto.name.trim() : existing.name;
    if (!name) {
      throw new BadRequestException('اسم العرض إلزامي');
    }

    const now = new Date().toISOString();

    return this.dbService.transaction(() => {
      db.prepare(`
        UPDATE promotions
        SET name = ?, description = ?, fixed_price = ?, status = ?, starts_at = ?, ends_at = ?, sort_order = ?, updated_at = ?
        WHERE id = ?
      `).run(
        name,
        dto.description !== undefined ? dto.description.trim() || null : existing.description,
        dto.fixedPrice !== undefined ? Math.round(dto.fixedPrice * 100) / 100 : existing.fixed_price,
        dto.status || existing.status,
        startsAt || null,
        endsAt || null,
        dto.sortOrder !== undefined ? dto.sortOrder : existing.sort_order,
        now,
        id,
      );

      if (dto.items && dto.items.length > 0) {
        db.prepare(`DELETE FROM promotion_items WHERE promotion_id = ?`).run(id);

        const itemsStmt = db.prepare(`
          INSERT INTO promotion_items (
            id, promotion_id, catalog_item_id, catalog_item_name_snapshot, catalog_item_type, quantity, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (let idx = 0; idx < dto.items.length; idx++) {
          const itemInput = dto.items[idx];
          const catalogItem = db
            .prepare(`SELECT id, name, type, base_price, status FROM catalog_items WHERE id = ?`)
            .get(itemInput.catalogItemId) as any;

          if (!catalogItem) {
            throw new BadRequestException(`عنصر الكتالوج غير موجود (${itemInput.catalogItemId})`);
          }

          itemsStmt.run(
            uuidv4(),
            id,
            catalogItem.id,
            catalogItem.name,
            catalogItem.type,
            itemInput.quantity && itemInput.quantity > 0 ? itemInput.quantity : 1,
            itemInput.sortOrder !== undefined ? itemInput.sortOrder : idx,
          );
        }
      }

      this.auditLogService.logEvent({
        actorUserId: userId,
        action: 'PROMOTION_UPDATED',
        entityType: 'CATALOG_ITEM',
        entityId: id,
        beforeData: existing,
        afterData: { name, fixedPrice: dto.fixedPrice, status: dto.status },
      });

      return this.findOne(id);
    });
  }

  archive(id: string, userId: string): { success: boolean } {
    const existing = this.findOne(id);
    const db = this.dbService.getDb();
    const now = new Date().toISOString();

    db.prepare(`UPDATE promotions SET status = 'ARCHIVED', updated_at = ? WHERE id = ?`).run(now, id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'PROMOTION_ARCHIVED',
      entityType: 'CATALOG_ITEM',
      entityId: id,
      beforeData: { status: existing.status },
      afterData: { status: 'ARCHIVED' },
    });

    return { success: true };
  }

  restore(id: string, userId: string): { success: boolean } {
    const existing = this.findOne(id);
    const db = this.dbService.getDb();
    const now = new Date().toISOString();

    db.prepare(`UPDATE promotions SET status = 'ACTIVE', updated_at = ? WHERE id = ?`).run(now, id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'PROMOTION_RESTORED',
      entityType: 'CATALOG_ITEM',
      entityId: id,
      beforeData: { status: existing.status },
      afterData: { status: 'ACTIVE' },
    });

    return { success: true };
  }

  // Snapshot for Cashier App Sync
  getActiveSnapshotForCashier(): PromotionEntity[] {
    const db = this.dbService.getDb();
    const now = new Date().toISOString();

    const rows = db.prepare(`
      SELECT id, name, description, fixed_price, status, starts_at, ends_at, sort_order, created_by, created_at, updated_at
      FROM promotions
      WHERE status = 'ACTIVE'
        AND (starts_at IS NULL OR starts_at <= ?)
        AND (ends_at IS NULL OR ends_at >= ?)
      ORDER BY sort_order ASC, created_at ASC
    `).all(now, now) as any[];

    return rows.map((r) => this.populatePromotionItems(r));
  }

  private populatePromotionItems(row: any): PromotionEntity {
    const db = this.dbService.getDb();
    const itemsRaw = db.prepare(`
      SELECT pi.*, ci.base_price as catalog_item_base_price
      FROM promotion_items pi
      LEFT JOIN catalog_items ci ON pi.catalog_item_id = ci.id
      WHERE pi.promotion_id = ?
      ORDER BY pi.sort_order ASC
    `).all(row.id) as any[];

    let originalTotal = 0;
    const items: PromotionItemEntity[] = itemsRaw.map((i) => {
      const basePrice = Number(i.catalog_item_base_price || 0);
      originalTotal += basePrice * i.quantity;
      return {
        id: i.id,
        promotion_id: i.promotion_id,
        catalog_item_id: i.catalog_item_id,
        catalog_item_name_snapshot: i.catalog_item_name_snapshot,
        catalog_item_type: i.catalog_item_type,
        quantity: i.quantity,
        sort_order: i.sort_order,
        catalog_item_base_price: basePrice,
      };
    });

    const fixedPrice = Number(row.fixed_price);
    const savings = Math.max(0, Math.round((originalTotal - fixedPrice) * 100) / 100);

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      fixed_price: fixedPrice,
      status: row.status,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      sort_order: row.sort_order,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      items,
      original_total_price: Math.round(originalTotal * 100) / 100,
      savings_amount: savings,
    };
  }
}
