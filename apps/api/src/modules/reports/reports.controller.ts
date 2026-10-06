import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller(['admin/reports', 'reports'])
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('financial')
  getFinancial(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getFinancialReport({ startDate, endDate });
  }

  @Get('barbers')
  getBarbers(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getBarbersReport({ startDate, endDate });
  }

  @Get('top-services')
  getTopServices(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getTopServices({ startDate, endDate });
  }

  @Get('promotions')
  getPromotions(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getPromotionsReport({ startDate, endDate });
  }

  @Get('bookings')
  getBookings(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getBookingsReport({ startDate, endDate });
  }

  @Get(['export/excel', 'export/csv'])
  async exportExcel(
    @Query('type') type: 'sales' | 'expenses' | 'shifts',
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Res() res: Response,
  ) {
    const reportType = type || 'sales';
    const buffer = await this.reportsService.exportExcel(reportType, { startDate, endDate });
    const filename = `report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
