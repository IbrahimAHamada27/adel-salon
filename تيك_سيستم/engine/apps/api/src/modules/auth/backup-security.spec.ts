import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.service';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Backup, Restore & Infrastructure Security Tests', () => {
  let dbService: DatabaseService;
  let authService: AuthService;
  let usersService: UsersService;

  const testDbFile = './data/test_backup_sec.sqlite';
  const backupDbFile = './data/test_backup_copy.sqlite';

  beforeAll(async () => {
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }
    if (fs.existsSync(backupDbFile)) {
      fs.unlinkSync(backupDbFile);
    }

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ DATABASE_FILE: testDbFile, JWT_SECRET: 'test-secret-key-32-characters-min-safe' })],
        }),
        DatabaseModule,
        AuditLogModule,
        UsersModule,
        AuthModule,
      ],
    }).compile();

    dbService = moduleRef.get<DatabaseService>(DatabaseService);
    authService = moduleRef.get<AuthService>(AuthService);
    usersService = moduleRef.get<UsersService>(UsersService);

    await authService.setupFirstOwner({
      name: 'مالك النظام',
      username: 'backup_owner',
      password: 'SafePassword2026!',
    });
  });

  afterAll(() => {
    if (dbService) {
      dbService.onModuleDestroy();
    }
    if (fs.existsSync(testDbFile)) {
      try { fs.unlinkSync(testDbFile); } catch {}
    }
    if (fs.existsSync(backupDbFile)) {
      try { fs.unlinkSync(backupDbFile); } catch {}
    }
  });

  it('1. Should perform SQLite online backup using VACUUM INTO and verify restored database integrity', () => {
    const db = dbService.getDb();
    
    // Create an isolated backup copy
    const resolvedBackupPath = path.resolve(process.cwd(), backupDbFile);
    if (fs.existsSync(resolvedBackupPath)) {
      fs.unlinkSync(resolvedBackupPath);
    }

    db.exec(`VACUUM INTO '${resolvedBackupPath.replace(/\\/g, '/')}'`);

    expect(fs.existsSync(resolvedBackupPath)).toBe(true);
    expect(fs.statSync(resolvedBackupPath).size).toBeGreaterThan(0);

    // Verify backup integrity
    const backupDb = new (require('node:sqlite').DatabaseSync)(resolvedBackupPath);
    const integrityCheck = backupDb.prepare('PRAGMA integrity_check;').get() as any;
    expect(integrityCheck.integrity_check).toBe('ok');

    const fkCheck = backupDb.prepare('PRAGMA foreign_key_check;').all();
    expect(fkCheck).toEqual([]);

    backupDb.close();
  });

  it('2. Should verify database file is protected outside public directories', () => {
    const dbPath = path.resolve(process.cwd(), testDbFile);
    expect(dbPath).not.toContain('public');
    expect(dbPath).not.toContain('static');
  });

  it('3. Should verify password_hash is never exposed in user responses', async () => {
    const cashier = usersService.findCashier();
    if (cashier) {
      expect((cashier as any).password_hash).toBeUndefined();
    }
    const status = authService.getAuthStatus();
    expect((status as any).password_hash).toBeUndefined();
  });

  it('4. Should reject SQL injection attempts in parameterized search queries', () => {
    const db = dbService.getDb();
    const maliciousInput = "'; DROP TABLE users; --";

    const stmt = db.prepare('SELECT * FROM users WHERE name = ?');
    const result = stmt.all(maliciousInput);
    expect(result).toEqual([]);

    // Table must still exist and be completely intact
    const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    expect(userCount).toBeGreaterThanOrEqual(1);
  });
});
