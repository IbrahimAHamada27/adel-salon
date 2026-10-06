import { Controller, Get, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SafeUser } from './entities/user.entity';
import { ManageCashierAccountDto } from '../cashier/dto/cashier-login.dto';
import * as bcrypt from 'bcryptjs';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('cashier')
  getCashierAccount() {
    const cashier = this.usersService.findCashier();
    return {
      exists: !!cashier,
      cashier: cashier || null,
    };
  }

  @Post('cashier')
  async manageCashier(@Body() dto: ManageCashierAccountDto, @CurrentUser() owner: SafeUser) {
    let passwordHash: string | undefined;
    if (dto.password) {
      if (dto.password.length < 4) {
        throw new BadRequestException('كلمة المرور يجب أن لا تقل عن 4 خانات.');
      }
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(dto.password, salt);
    }

    const existing = this.usersService.findCashier();
    if (!existing && !passwordHash) {
      throw new BadRequestException('كلمة المرور مطلوبة لإنشاء حساب الكاشير الأول.');
    }

    const updated = this.usersService.createOrUpdateCashier({
      name: dto.name,
      username: dto.username,
      passwordHash,
      isActive: dto.isActive,
    });

    this.auditLogService.logEvent({
      actorUserId: owner.id,
      action: existing ? 'UPDATE_CASHIER_ACCOUNT' : 'CREATE_CASHIER_ACCOUNT',
      entityType: 'USER',
      entityId: updated.id,
      afterData: { name: updated.name, username: updated.username, isActive: updated.is_active },
    });

    return {
      message: 'تم حفظ إعدادات حساب الكاشير بنجاح.',
      cashier: updated,
    };
  }
}
