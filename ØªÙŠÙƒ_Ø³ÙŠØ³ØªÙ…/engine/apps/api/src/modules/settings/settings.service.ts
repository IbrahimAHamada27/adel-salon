import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto, UpdateProfileDto } from './dto/settings.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SettingsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly auditLogService: AuditLogService,
    private readonly usersService: UsersService,
  ) {}

  getSettings(userId: string) {
    const user = this.usersService.findSafeById(userId);
    const cashier = this.usersService.findCashier();
    const db = this.dbService.getDb();

    const counts = {
      services: (db.prepare(`SELECT COUNT(*) as c FROM catalog_items WHERE type = 'SERVICE' AND status != 'ARCHIVED'`).get() as any)?.c || 0,
      products: (db.prepare(`SELECT COUNT(*) as c FROM catalog_items WHERE type = 'PRODUCT' AND status != 'ARCHIVED'`).get() as any)?.c || 0,
      barbers: (db.prepare(`SELECT COUNT(*) as c FROM employees WHERE status != 'ARCHIVED'`).get() as any)?.c || 0,
      promotions: (db.prepare(`SELECT COUNT(*) as c FROM promotions WHERE status = 'ACTIVE'`).get() as any)?.c || 0,
      customers: (db.prepare(`SELECT COUNT(*) as c FROM customers`).get() as any)?.c || 0,
      invoices: (db.prepare(`SELECT COUNT(*) as c FROM invoices`).get() as any)?.c || 0,
    };

    return {
      owner: user,
      cashierAccount: cashier,
      systemCounts: counts,
      version: '1.0.0',
      databaseEngine: 'SQLite (WAL Mode)',
      offlineSyncStatus: 'Ready & Listening',
    };
  }

  async updateProfile(dto: UpdateProfileDto, userId: string) {
    const db = this.dbService.getDb();
    const now = new Date().toISOString();

    db.prepare(`UPDATE users SET name = ?, updated_at = ? WHERE id = ?`).run(dto.name.trim(), now, userId);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'OWNER_PROFILE_UPDATED',
      entityType: 'USER',
      entityId: userId,
      afterData: { name: dto.name },
    });

    return this.usersService.findSafeById(userId);
  }

  async changePassword(dto: ChangePasswordDto, userId: string) {
    const user = this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('المستخدم غير موجود');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('كلمة المرور الحالية غير صحيحة');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('كلمة المرور الجديدة لا يمكن أن تطابق كلمة المرور الحالية');
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(dto.newPassword, salt);
    const now = new Date().toISOString();

    const db = this.dbService.getDb();
    db.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`).run(newHash, now, userId);

    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: userId,
    });

    return { message: 'تم تغيير كلمة المرور بنجاح' };
  }
}
