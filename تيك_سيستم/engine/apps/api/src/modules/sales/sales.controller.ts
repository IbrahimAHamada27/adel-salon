import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller(['admin/sales', 'sales'])
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('invoices')
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.salesService.findAll({
      startDate,
      endDate,
      status,
      paymentMethod,
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('invoices/:id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }
}
