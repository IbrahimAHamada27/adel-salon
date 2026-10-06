import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { User, SafeUser } from './entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(private readonly dbService: DatabaseService) {}

  countOwners(): number {
    const db = this.dbService.getDb();
    const row = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'OWNER'`).get() as { count: number };
    return row.count;
  }

  findByUsername(username: string): User | undefined {
    const db = this.dbService.getDb();
    return db.prepare(`SELECT * FROM users WHERE LOWER(username) = LOWER(?)`).get(username) as User | undefined;
  }

  findById(id: string): User | undefined {
    const db = this.dbService.getDb();
    return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as User | undefined;
  }

  findSafeById(id: string): SafeUser | undefined {
    const user = this.findById(id);
    if (!user) return undefined;
    const { password_hash, ...safe } = user;
    return safe;
  }

  createOwner(data: { name: string; username: string; email?: string; passwordHash: string }): SafeUser {
    const db = this.dbService.getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO users (id, name, username, email, password_hash, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'OWNER', 1, ?, ?)
    `);

    stmt.run(id, data.name, data.username.trim(), data.email?.trim() || null, data.passwordHash, now, now);

    return {
      id,
      name: data.name,
      username: data.username.trim(),
      email: data.email?.trim() || null,
      role: 'OWNER',
      is_active: 1,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    };
  }

  findCashier(): SafeUser | undefined {
    const db = this.dbService.getDb();
    const user = db.prepare(`SELECT * FROM users WHERE role = 'CASHIER'`).get() as User | undefined;
    if (!user) return undefined;
    const { password_hash, ...safe } = user;
    return safe;
  }

  createOrUpdateCashier(data: { name: string; username: string; passwordHash?: string; isActive?: boolean }): SafeUser {
    const db = this.dbService.getDb();
    const existing = db.prepare(`SELECT * FROM users WHERE role = 'CASHIER'`).get() as User | undefined;
    const now = new Date().toISOString();

    if (existing) {
      if (data.passwordHash) {
        db.prepare(`
          UPDATE users 
          SET name = ?, username = ?, password_hash = ?, is_active = ?, updated_at = ?
          WHERE id = ?
        `).run(data.name, data.username.trim(), data.passwordHash, data.isActive !== undefined ? (data.isActive ? 1 : 0) : existing.is_active, now, existing.id);
      } else {
        db.prepare(`
          UPDATE users 
          SET name = ?, username = ?, is_active = ?, updated_at = ?
          WHERE id = ?
        `).run(data.name, data.username.trim(), data.isActive !== undefined ? (data.isActive ? 1 : 0) : existing.is_active, now, existing.id);
      }
      return this.findSafeById(existing.id)!;
    } else {
      const id = uuidv4();
      if (!data.passwordHash) {
        throw new Error('Password hash is required for new cashier');
      }
      db.prepare(`
        INSERT INTO users (id, name, username, password_hash, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'CASHIER', ?, ?, ?)
      `).run(id, data.name, data.username.trim(), data.passwordHash, data.isActive !== false ? 1 : 0, now, now);

      return this.findSafeById(id)!;
    }
  }

  updateLastLogin(userId: string): void {
    const db = this.dbService.getDb();
    const now = new Date().toISOString();
    db.prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`).run(now, userId);
  }
}
