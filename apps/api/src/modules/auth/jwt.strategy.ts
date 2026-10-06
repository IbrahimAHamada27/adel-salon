import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { SafeUser } from '../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');
    const secret = configService.get<string>('JWT_SECRET');

    if (nodeEnv === 'production' && (!secret || secret.length < 32 || secret.includes('development') || secret.includes('secret') || secret.includes('password'))) {
      throw new Error('FATAL SECURITY CONFIGURATION: In production mode, JWT_SECRET must be set to a cryptographically strong secret of at least 32 characters.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'dev-only-local-secret-key-min-32-chars-strictly-for-testing-purposes',
    });
  }

  async validate(payload: { sub: string; username: string; role: string }): Promise<SafeUser> {
    const user = this.usersService.findSafeById(payload.sub);
    if (!user || !user.is_active) {
      throw new UnauthorizedException('المستخدم غير مصرح له أو الحساب غير نشط');
    }
    return user;
  }
}
