import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto, ReorderEmployeeDto } from './dto/employee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SafeUser } from '../users/entities/user.entity';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(@Query('includeArchived') includeArchived?: string) {
    return this.employeesService.findAll(includeArchived === 'true');
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.employeesService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: SafeUser) {
    return this.employeesService.create(dto, user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @CurrentUser() user: SafeUser) {
    return this.employeesService.update(id, dto, user.id);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.employeesService.archive(id, user.id);
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.employeesService.restore(id, user.id);
  }

  @Patch(':id/reorder')
  reorder(@Param('id') id: string, @Body() dto: ReorderEmployeeDto, @CurrentUser() user: SafeUser) {
    return this.employeesService.reorder(id, dto.direction, user.id);
  }
}
