import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs';

describe('AuthModule Tests & Security Hardening', () => {
  let authService: AuthService;
  let dbService: DatabaseService;
  const testDbFile = './data/test_auth_sec.sqlite';

  beforeAll(async () => {
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
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

    authService = moduleRef.get<AuthService>(AuthService);
    dbService = moduleRef.get<DatabaseService>(DatabaseService);
  });

  afterAll(() => {
    if (dbService) {
      dbService.onModuleDestroy();
    }
    if (fs.existsSync(testDbFile)) {
      try { fs.unlinkSync(testDbFile); } catch {}
    }
  });

  it('1. Initial auth status should indicate setup is required', () => {
    const status = authService.getAuthStatus();
    expect(status.hasOwner).toBe(false);
    expect(status.isSetupRequired).toBe(true);
  });

  it('2. Should reject setup with weak password or password equal to username', async () => {
    // Password equals username
    await expect(
      authService.setupFirstOwner({
        name: 'صاحب المحل',
        username: 'adminowner',
        password: 'adminowner',
      }),
    ).rejects.toThrow(BadRequestException);

    // Common weak password
    await expect(
      authService.setupFirstOwner({
        name: 'صاحب المحل',
        username: 'adminowner',
        password: 'password',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('3. Should successfully setup the first owner with strong password', async () => {
    const result = await authService.setupFirstOwner({
      name: 'صاحب المحل',
      username: 'owner',
      password: 'StrongAuthKey2026!',
    });

    expect(result.user).toBeDefined();
    expect(result.user.name).toBe('صاحب المحل');
    expect(result.user.username).toBe('owner');
    expect(result.user.role).toBe('OWNER');
    expect(result.token).toBeDefined();

    const statusAfter = authService.getAuthStatus();
    expect(statusAfter.hasOwner).toBe(true);
    expect(statusAfter.isSetupRequired).toBe(false);
  });

  it('4. Should NOT allow setup of second owner (Prevents repeated setup)', async () => {
    await expect(
      authService.setupFirstOwner({
        name: 'مالك آخر',
        username: 'owner2',
        password: 'StrongAuthKey2026!',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('5. Should successfully login with valid credentials', async () => {
    const result = await authService.login({
      username: 'owner',
      password: 'StrongAuthKey2026!',
    });

    expect(result.user.username).toBe('owner');
    expect(result.token).toBeDefined();
  });

  it('6. Should fail login with invalid password without leaking user info', async () => {
    await expect(
      authService.login({
        username: 'owner',
        password: 'wrong_password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('7. Should lock out after repeated failed login attempts (Brute Force Protection)', async () => {
    const testIp = '192.168.1.100';

    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      await expect(
        authService.login({ username: 'owner', password: 'wrong' }, testIp),
      ).rejects.toThrow(UnauthorizedException);
    }

    // 5th failed attempt triggers lockout
    await expect(
      authService.login({ username: 'owner', password: 'wrong' }, testIp),
    ).rejects.toThrow(UnauthorizedException);

    // 6th attempt should be blocked by lockout immediately even with correct password!
    await expect(
      authService.login({ username: 'owner', password: 'StrongAuthKey2026!' }, testIp),
    ).rejects.toThrow(/تم قفل تسجيل الدخول مؤقتاً/);
  });

  it('8. Should generate and verify captcha challenge correctly', () => {
    const captcha = authService.generateCaptchaChallenge();
    expect(captcha.challengeId).toBeDefined();
    expect(captcha.question).toContain('ما هو حاصل جمع');

    // Extract numbers from question
    const match = captcha.question.match(/(\d+)\s*\+\s*(\d+)/);
    expect(match).toBeTruthy();
    const sum = String(Number(match![1]) + Number(match![2]));

    // Correct verification
    const isValid = authService.verifyCaptchaChallenge(captcha.challengeId, sum);
    expect(isValid).toBe(true);

    // Challenge cannot be reused
    const isReused = authService.verifyCaptchaChallenge(captcha.challengeId, sum);
    expect(isReused).toBe(false);
  });
});

