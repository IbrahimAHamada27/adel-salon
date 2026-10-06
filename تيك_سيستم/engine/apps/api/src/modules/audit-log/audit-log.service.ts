import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { v4 as uuidv4 } from 'uuid';

export interface LogAuditParams {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: any;
  afterData?: any;
}

export interface AuditEventEntity {
  id: string;
  actor_user_id: string | null;
  actor_name?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before_data: any;
  after_data: any;
  created_at: string;
}

@Injectable()
export class AuditLogService implements OnModuleInit {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly dbService: DatabaseService) {}

  onModuleInit() {
    try {
      const db = this.dbService.getDb();
      // Purge all legacy non-shift events to keep only OPEN_SHIFT and CLOSE_SHIFT
      db.prepare(`DELETE FROM audit_events WHERE action NOT IN ('OPEN_SHIFT', 'CLOSE_SHIFT')`).run();
      this.logger.log('Audit log table cleaned to contain exclusively shift lifecycle events (OPEN_SHIFT, CLOSE_SHIFT).');
    } catch (err: any) {
      this.logger.warn(`Could not purge old audit logs on init: ${err.message}`);
    }
  }

  logEvent(params: LogAuditParams): void {
    // Strictly restrict audit logging ONLY to shift opening and shift closing
    if (params.action !== 'OPEN_SHIFT' && params.action !== 'CLOSE_SHIFT') {
      return;
    }

    try {
      const db = this.dbService.getDb();
      const id = uuidv4();
      const now = new Date().toISOString();

      const stmt = db.prepare(`
        INSERT INTO audit_events (
          id, actor_user_id, action, entity_type, entity_id, before_data, after_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        params.actorUserId || null,
        params.action,
        'SHIFT',
        params.entityId,
        params.beforeData ? JSON.stringify(params.beforeData) : null,
        params.afterData ? JSON.stringify(params.afterData) : null,
        now,
      );

      this.logger.log(`Audit event logged: [${params.action}] for shift ${params.entityId}`);
    } catch (err: any) {
      this.logger.error(`Failed to record audit event: ${err.message}`, err.stack);
    }
  }

  findAll(filters: {
    entityType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    limit: number;
    offset: number;
  }): { events: AuditEventEntity[]; total: number } {
    const db = this.dbService.getDb();
    let whereClause = `WHERE a.action IN ('OPEN_SHIFT', 'CLOSE_SHIFT')`;
    const params: any[] = [];

    if (filters.action && filters.action !== 'ALL') {
      whereClause += ' AND a.action = ?';
      params.push(filters.action);
    }

    if (filters.startDate) {
      whereClause += ' AND a.created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      whereClause += ' AND a.created_at <= ?';
      params.push(filters.endDate);
    }

    if (filters.search) {
      const term = `%${filters.search.trim()}%`;
      whereClause += ' AND (a.action LIKE ? OR a.entity_id LIKE ? OR u.name LIKE ?)';
      params.push(term, term, term);
    }

    const countRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM audit_events a
      LEFT JOIN users u ON a.actor_user_id = u.id
      ${whereClause}
    `).get(...params) as { count: number };

    const query = `
      SELECT a.*, u.name as actor_name
      FROM audit_events a
      LEFT JOIN users u ON a.actor_user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(query).all(...params, filters.limit, filters.offset) as any[];

    const events = rows.map((r) => ({
      ...r,
      before_data: r.before_data ? JSON.parse(r.before_data) : null,
      after_data: r.after_data ? JSON.parse(r.after_data) : null,
    }));

    return {
      events,
      total: countRow?.count || 0,
    };
  }
}
