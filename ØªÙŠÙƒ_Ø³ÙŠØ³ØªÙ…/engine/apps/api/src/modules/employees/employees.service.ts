import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { Employee, EmployeeStatus } from './entities/employee.entity';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly auditLogService: AuditLogService,
  ) {}

  findAll(includeArchived = false): Employee[] {
    const db = this.dbService.getDb();
    if (includeArchived) {
      return db.prepare('SELECT * FROM employees ORDER BY sort_order ASC, created_at ASC').all() as Employee[];
    }
    return db.prepare("SELECT * FROM employees WHERE status != 'ARCHIVED' ORDER BY sort_order ASC, created_at ASC").all() as Employee[];
  }

  findActiveOnly(): Employee[] {
    const db = this.dbService.getDb();
    return db.prepare("SELECT id, name, role_title, sort_order FROM employees WHERE status = 'ACTIVE' ORDER BY sort_order ASC, created_at ASC").all() as Employee[];
  }

  findById(id: string): Employee {
    const db = this.dbService.getDb();
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as Employee | undefined;
    if (!employee) {
      throw new NotFoundException('الموظف أو الحلاق غير موجود.');
    }
    return employee;
  }

  create(dto: CreateEmployeeDto, userId: string): Employee {
    const db = this.dbService.getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    const maxSortRow = db.prepare('SELECT MAX(sort_order) as max_sort FROM employees').get() as { max_sort: number | null };
    const nextSortOrder = (maxSortRow?.max_sort ?? -1) + 1;

    const stmt = db.prepare(`
      INSERT INTO employees (id, name, phone, role_title, status, sort_order, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)
    `);

    stmt.run(id, dto.name.trim(), dto.phone?.trim() || null, dto.roleTitle?.trim() || null, nextSortOrder, userId, now, now);

    const created = this.findById(id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'CREATE_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: id,
      afterData: created,
    });

    return created;
  }

  update(id: string, dto: UpdateEmployeeDto, userId: string): Employee {
    const current = this.findById(id);
    const db = this.dbService.getDb();
    const now = new Date().toISOString();

    const newName = dto.name !== undefined ? dto.name.trim() : current.name;
    const newPhone = dto.phone !== undefined ? (dto.phone.trim() || null) : current.phone;
    const newRoleTitle = dto.roleTitle !== undefined ? (dto.roleTitle.trim() || null) : current.role_title;
    const newStatus = dto.status !== undefined ? dto.status : current.status;

    db.prepare(`
      UPDATE employees
      SET name = ?, phone = ?, role_title = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(newName, newPhone, newRoleTitle, newStatus, now, id);

    const updated = this.findById(id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'UPDATE_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: id,
      beforeData: current,
      afterData: updated,
    });

    return updated;
  }

  archive(id: string, userId: string): Employee {
    const current = this.findById(id);
    const db = this.dbService.getDb();
    const now = new Date().toISOString();

    db.prepare("UPDATE employees SET status = 'ARCHIVED', updated_at = ? WHERE id = ?").run(now, id);
    const updated = this.findById(id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'ARCHIVE_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: id,
      beforeData: current,
      afterData: updated,
    });

    return updated;
  }

  restore(id: string, userId: string): Employee {
    const current = this.findById(id);
    const db = this.dbService.getDb();
    const now = new Date().toISOString();

    db.prepare("UPDATE employees SET status = 'ACTIVE', updated_at = ? WHERE id = ?").run(now, id);
    const updated = this.findById(id);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'RESTORE_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: id,
      beforeData: current,
      afterData: updated,
    });

    return updated;
  }

  reorder(id: string, direction: 'UP' | 'DOWN', userId: string): Employee[] {
    const all = this.findAll(true);
    const index = all.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new NotFoundException('الموظف غير موجود.');
    }

    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= all.length) {
      return this.findAll();
    }

    const current = all[index];
    const target = all[targetIndex];
    const db = this.dbService.getDb();
    const now = new Date().toISOString();

    const updateStmt = db.prepare('UPDATE employees SET sort_order = ?, updated_at = ? WHERE id = ?');

    this.dbService.transaction(() => {
      updateStmt.run(target.sort_order, now, current.id);
      updateStmt.run(current.sort_order, now, target.id);
    });

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'REORDER_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: id,
      afterData: { direction, fromIndex: index, toIndex: targetIndex },
    });

    return this.findAll();
  }
}
