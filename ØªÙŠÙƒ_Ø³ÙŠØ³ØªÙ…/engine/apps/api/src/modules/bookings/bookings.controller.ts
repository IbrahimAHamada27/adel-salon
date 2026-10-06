import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SafeUser } from '../users/entities/user.entity';

@Controller(['admin/bookings', 'bookings'])
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: SafeUser) {
    return this.bookingsService.create(dto, user.id);
  }

  @Get()
  findAll(
    @Query('datePreset') datePreset?: 'TODAY' | 'TOMORROW' | 'CUSTOM' | 'ALL',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('search') search?: string,
  ) {
    return this.bookingsService.findAll({
      datePreset,
      startDate,
      endDate,
      status,
      employeeId,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.bookingsService.update(id, dto, user.id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'CONFIRMED' | 'ARRIVED' | 'NO_SHOW' | 'CANCELLED' | 'CONVERTED_TO_INVOICE',
    @CurrentUser() user: SafeUser,
  ) {
    return this.bookingsService.updateStatus(id, status, user.id);
  }
}
