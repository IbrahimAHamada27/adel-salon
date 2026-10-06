import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { CashierService } from './cashier.service';
import { AuthService } from '../auth/auth.service';
import { PromotionsService } from '../promotions/promotions.service';
import { BookingsService } from '../bookings/bookings.service';
import { CreateBookingDto } from '../bookings/dto/create-booking.dto';
import { CashierLoginDto } from './dto/cashier-login.dto';
import { OutboxSyncDto } from './dto/outbox-sync.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SafeUser } from '../users/entities/user.entity';

@Controller('cashier')
export class CashierController {
  constructor(
    private readonly cashierService: CashierService,
    private readonly authService: AuthService,
    private readonly promotionsService: PromotionsService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Get('health')
  healthCheck() {
    return {
      status: 'OK',
      module: 'CASHIER_GATEWAY',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: CashierLoginDto, @Ip() ip: string) {
    return this.authService.cashierLogin(
      {
        username: dto.username,
        password: dto.password,
      },
      ip || '127.0.0.1',
    );
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'OWNER')
  logout(@CurrentUser() user: SafeUser) {
    return this.authService.cashierLogout(user.id);
  }

  @Get('auth/session')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'OWNER')
  getSession(@CurrentUser() user: SafeUser) {
    return {
      user,
      authenticated: true,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('catalog/snapshot')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'OWNER')
  getCatalogSnapshot() {
    return this.cashierService.getCatalogSnapshot();
  }

  @Get('employees/snapshot')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'OWNER')
  getEmployeesSnapshot() {
    return this.cashierService.getEmployeesSnapshot();
  }

  // --- Promotions Snapshot for Cashier ---
  @Get('promotions/snapshot')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'OWNER')
  getPromotionsSnapshot() {
    return {
      generatedAt: new Date().toISOString(),
      promotions: this.promotionsService.getActiveSnapshotForCashier(),
    };
  }

  // --- Bookings for Cashier ---
  @Get('bookings/upcoming')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'OWNER')
  getUpcomingBookings() {
    return {
      generatedAt: new Date().toISOString(),
      bookings: this.bookingsService.getUpcomingForCashier(),
    };
  }

  @Post('bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'OWNER')
  createBooking(@Body() dto: CreateBookingDto, @CurrentUser() user: SafeUser) {
    return this.bookingsService.create({ ...dto, createdFrom: 'CASHIER' }, user.id);
  }

  @Patch('bookings/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'OWNER')
  updateBookingStatus(
    @Param('id') id: string,
    @Body('status') status: 'CONFIRMED' | 'ARRIVED' | 'NO_SHOW' | 'CANCELLED' | 'CONVERTED_TO_INVOICE',
    @Body('convertedInvoiceId') convertedInvoiceId: string | undefined,
    @CurrentUser() user: SafeUser,
  ) {
    return this.bookingsService.updateStatus(id, status, user.id, convertedInvoiceId);
  }

  // --- Outbox Sync Endpoint for Cashier ---
  @Post('sync/outbox')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'OWNER')
  syncOutbox(
    @Body() dto: OutboxSyncDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.cashierService.processOutboxSync(dto, user.id);
  }
}
