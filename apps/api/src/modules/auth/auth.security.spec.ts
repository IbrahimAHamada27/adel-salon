import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { SafeUser } from '../users/entities/user.entity';

describe('Security Roles & Authorization Guard Tests', () => {
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  function createMockExecutionContext(user?: SafeUser, requiredRoles?: string[]): ExecutionContext {
    const mockHandler = () => {};
    const mockClass = class {};

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

    return {
      getHandler: () => mockHandler,
      getClass: () => mockClass,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('1. Should allow request when no specific roles are required', () => {
    const context = createMockExecutionContext(undefined, undefined);
    expect(rolesGuard.canActivate(context)).toBe(true);
  });

  it('2. Should reject unauthenticated user trying to access OWNER-only endpoint', () => {
    const context = createMockExecutionContext(undefined, ['OWNER']);
    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('3. Should block CASHIER user from accessing OWNER-only endpoint', () => {
    const cashierUser: SafeUser = {
      id: 'cashier-1',
      name: 'Cashier Employee',
      username: 'cashier_user',
      role: 'CASHIER',
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const context = createMockExecutionContext(cashierUser, ['OWNER']);
    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('4. Should allow OWNER user to access OWNER-only endpoint', () => {
    const ownerUser: SafeUser = {
      id: 'owner-1',
      name: 'Shop Owner',
      username: 'owner_user',
      role: 'OWNER',
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const context = createMockExecutionContext(ownerUser, ['OWNER']);
    expect(rolesGuard.canActivate(context)).toBe(true);
  });

  it('5. Should block OWNER user from accessing CASHIER-only POS endpoints', () => {
    const ownerUser: SafeUser = {
      id: 'owner-1',
      name: 'Shop Owner',
      username: 'owner_user',
      role: 'OWNER',
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const context = createMockExecutionContext(ownerUser, ['CASHIER']);
    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
  });
});
