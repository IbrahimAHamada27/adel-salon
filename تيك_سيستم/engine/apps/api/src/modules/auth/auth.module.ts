import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        const secret = configService.get<string>('JWT_SECRET');

        if (nodeEnv === 'production') {
          if (!secret || secret.length < 32 || secret.includes('development') || secret.includes('secret') || secret.includes('password')) {
            throw new Error(
              'FATAL SECURITY CONFIGURATION: In production mode, JWT_SECRET must be set to a cryptographically strong secret of at least 32 characters, without default placeholder words.',
            );
          }
          return {
            secret,
            signOptions: {
              expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
            },
          };
        }

        // Development / test fallback
        return {
          secret: secret || 'dev-only-local-secret-key-min-32-chars-strictly-for-testing-purposes',
          signOptions: {
            expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule {}
