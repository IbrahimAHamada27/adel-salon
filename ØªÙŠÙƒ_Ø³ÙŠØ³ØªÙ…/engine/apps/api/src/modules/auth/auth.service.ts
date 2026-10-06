import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { SetupOwnerDto } from './dto/setup-owner.dto';
import { LoginDto } from './dto/login.dto';
import { SafeUser } from '../users/entities/user.entity';

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  '12345678',
  '123456789',
  'admin123',
  'qwerty123',
  'owner123',
  'cashier123',
  'barber123',
  'password123',
  'welcome1',
]);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly failedAttempts = new Map<string, AttemptRecord>();
  private readonly captchaChallenges = new Map<string, { answer: string; expiresAt: number }>();
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
  ) {}

  getAuthStatus(): { hasOwner: boolean; isSetupRequired: boolean } {
    const ownerCount = this.usersService.countOwners();
    return {
      hasOwner: ownerCount > 0,
      isSetupRequired: ownerCount === 0,
    };
  }

  // --- Captcha Challenge Generator & Verifier ---
  generateCaptchaChallenge(): { challengeId: string; question: string } {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = String(num1 + num2);
    const challengeId = crypto.randomUUID();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    this.captchaChallenges.set(challengeId, { answer, expiresAt });
    return {
      challengeId,
      question: `ما هو حاصل جمع ${num1} + ${num2}؟`,
    };
  }

  verifyCaptchaChallenge(challengeId?: string, solution?: string): boolean {
    if (!challengeId || !solution) return false;
    const challenge = this.captchaChallenges.get(challengeId);
    if (!challenge) return false;
    if (Date.now() > challenge.expiresAt) {
      this.captchaChallenges.delete(challengeId);
      return false;
    }
    this.captchaChallenges.delete(challengeId);
    return challenge.answer.trim() === solution.trim();
  }

  // --- Password Policy Validator ---
  validatePasswordPolicy(password: string, username: string) {
    if (password.length < 8) {
      throw new BadRequestException('كلمة المرور يجب ألا تقل عن 8 خانات.');
    }
    if (password.toLowerCase() === username.toLowerCase()) {
      throw new BadRequestException('كلمة المرور لا يمكن أن تطابق اسم المستخدم.');
    }
    if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
      throw new BadRequestException('كلمة المرور ضعيفة وشائعة جداً، يرجى اختيار كلمة مرور أكثر أماناً.');
    }
  }

  // --- Rate Limiter & Lockout Check ---
  private checkRateLimit(key: string) {
    const record = this.failedAttempts.get(key);
    if (!record) return;

    if (record.lockedUntil && Date.now() < record.lockedUntil) {
      const remainingSeconds = Math.ceil((record.lockedUntil - Date.now()) / 1000);
      throw new UnauthorizedException(
        `تم قفل تسجيل الدخول مؤقتاً لكثرة المحاولات غير الصحيحة. يرجى الانتظار ${remainingSeconds} ثانية.`,
      );
    }

    // Reset window if expired
    if (Date.now() - record.firstAttemptAt > this.LOCKOUT_DURATION_MS) {
      this.failedAttempts.delete(key);
    }
  }

  private recordFailedAttempt(key: string) {
    const now = Date.now();
    const record = this.failedAttempts.get(key) || { count: 0, firstAttemptAt: now };
    record.count += 1;

    if (record.count >= this.MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = now + this.LOCKOUT_DURATION_MS;
      this.logger.warn(`Account/IP locked out due to multiple failed attempts: ${key}`);
    }

    this.failedAttempts.set(key, record);
  }

  private resetFailedAttempts(key: string) {
    this.failedAttempts.delete(key);
  }

  async setupFirstOwner(dto: SetupOwnerDto): Promise<{ user: SafeUser; token: string }> {
    const status = this.getAuthStatus();
    if (status.hasOwner) {
      throw new BadRequestException('تم إعداد حساب المالك مسبقاً، لا يمكن تكرار هذه العملية.');
    }

    this.validatePasswordPolicy(dto.password, dto.username);

    const existingUser = this.usersService.findByUsername(dto.username);
    if (existingUser) {
      throw new BadRequestException('اسم المستخدم مستخدم بالفعل.');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = this.usersService.createOwner({
      name: dto.name.trim(),
      username: dto.username.trim(),
      email: dto.email?.trim(),
      passwordHash,
    });

    this.auditLogService.logEvent({
      actorUserId: user.id,
      action: 'OWNER_SETUP',
      entityType: 'USER',
      entityId: user.id,
      afterData: { name: user.name, username: user.username, role: user.role },
    });

    const token = this.generateToken(user);
    this.logger.log(`First owner setup completed for user: ${user.username}`);

    return { user, token };
  }

  async login(dto: LoginDto, ip: string = '127.0.0.1'): Promise<{ user: SafeUser; token: string }> {
    const rateLimitKey = `admin_${dto.username.toLowerCase()}_${ip}`;
    this.checkRateLimit(rateLimitKey);

    const user = this.usersService.findByUsername(dto.username);
    if (!user) {
      this.recordFailedAttempt(rateLimitKey);
      this.auditLogService.logEvent({
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        entityId: dto.username,
        afterData: { reason: 'User not found' },
      });
      throw new UnauthorizedException('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }

    if (user.role !== 'OWNER') {
      this.recordFailedAttempt(rateLimitKey);
      this.auditLogService.logEvent({
        actorUserId: user.id,
        action: 'ADMIN_LOGIN_REJECTED',
        entityType: 'AUTH',
        entityId: user.id,
        afterData: { reason: 'Role is not OWNER' },
      });
      throw new UnauthorizedException('حساب الكاشير مخصص لتطبيق الكاشير المكتبي فقط ولا يمكنه الدخول للوحة الإدارة.');
    }

    if (!user.is_active) {
      this.recordFailedAttempt(rateLimitKey);
      this.auditLogService.logEvent({
        actorUserId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        entityId: user.id,
        afterData: { reason: 'Account inactive' },
      });
      throw new UnauthorizedException('الحساب معطل، يرجى التواصل مع الإدارة.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      this.recordFailedAttempt(rateLimitKey);
      this.auditLogService.logEvent({
        actorUserId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        entityId: user.id,
        afterData: { reason: 'Invalid password' },
      });
      throw new UnauthorizedException('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }

    // Login success: reset lockout
    this.resetFailedAttempts(rateLimitKey);

    const { password_hash, ...safeUser } = user;

    this.usersService.updateLastLogin(user.id);

    this.auditLogService.logEvent({
      actorUserId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'AUTH',
      entityId: user.id,
    });

    const token = this.generateToken(safeUser);
    return { user: safeUser, token };
  }

  async cashierLogin(dto: LoginDto, ip: string = '127.0.0.1'): Promise<{ user: SafeUser; token: string }> {
    const rateLimitKey = `cashier_${dto.username.toLowerCase()}_${ip}`;
    this.checkRateLimit(rateLimitKey);

    const user = this.usersService.findByUsername(dto.username);
    if (!user) {
      this.recordFailedAttempt(rateLimitKey);
      this.auditLogService.logEvent({
        action: 'CASHIER_LOGIN_FAILED',
        entityType: 'AUTH',
        entityId: dto.username,
        afterData: { reason: 'User not found' },
      });
      throw new UnauthorizedException('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }

    if (user.role !== 'CASHIER') {
      this.recordFailedAttempt(rateLimitKey);
      this.auditLogService.logEvent({
        actorUserId: user.id,
        action: 'CASHIER_LOGIN_REJECTED',
        entityType: 'AUTH',
        entityId: user.id,
        afterData: { reason: 'Owner cannot login to Cashier app' },
      });
      throw new UnauthorizedException('حساب المالك مخصص للوحة الإدارة فقط ولا يمكنه استخدام تطبيق الكاشير.');
    }

    if (!user.is_active) {
      this.recordFailedAttempt(rateLimitKey);
      this.auditLogService.logEvent({
        actorUserId: user.id,
        action: 'CASHIER_LOGIN_FAILED',
        entityType: 'AUTH',
        entityId: user.id,
        afterData: { reason: 'Cashier account is inactive' },
      });
      throw new UnauthorizedException('تم إيقاف حساب الكاشير، يرجى مراجعة إدارة الصالون.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      this.recordFailedAttempt(rateLimitKey);
      this.auditLogService.logEvent({
        actorUserId: user.id,
        action: 'CASHIER_LOGIN_FAILED',
        entityType: 'AUTH',
        entityId: user.id,
        afterData: { reason: 'Invalid password' },
      });
      throw new UnauthorizedException('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }

    this.resetFailedAttempts(rateLimitKey);
    this.usersService.updateLastLogin(user.id);

    const { password_hash, ...safeUser } = user;

    this.auditLogService.logEvent({
      actorUserId: user.id,
      action: 'CASHIER_LOGIN_SUCCESS',
      entityType: 'AUTH',
      entityId: user.id,
    });

    const token = this.generateToken(safeUser);
    return { user: safeUser, token };
  }

  logout(userId: string): { success: boolean } {
    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'LOGOUT',
      entityType: 'AUTH',
      entityId: userId,
    });
    return { success: true };
  }

  cashierLogout(userId: string): { success: boolean } {
    this.auditLogService.logEvent({
      actorUserId: userId,
      action: 'CASHIER_LOGOUT',
      entityType: 'AUTH',
      entityId: userId,
    });
    return { success: true };
  }

  private generateToken(user: SafeUser): string {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}

