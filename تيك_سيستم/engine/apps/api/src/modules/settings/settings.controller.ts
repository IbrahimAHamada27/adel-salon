import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ChangePasswordDto, UpdateProfileDto } from './dto/settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SafeUser } from '../users/entities/user.entity';

@Controller(['admin/settings', 'settings'])
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(@CurrentUser() user: SafeUser) {
    return this.settingsService.getSettings(user.id);
  }

  @Put('profile')
  updateProfile(@Body() dto: UpdateProfileDto, @CurrentUser() user: SafeUser) {
    return this.settingsService.updateProfile(dto, user.id);
  }

  @Post('password')
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: SafeUser) {
    return this.settingsService.changePassword(dto, user.id);
  }
}
