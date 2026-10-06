import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SafeUser } from '../users/entities/user.entity';

@Controller(['admin/promotions', 'promotions'])
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePromotionDto, @CurrentUser() user: SafeUser) {
    return this.promotionsService.create(dto, user.id);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('filterType') filterType?: 'ALL' | 'ACTIVE_NOW' | 'EXPIRED' | 'SCHEDULED' | 'ARCHIVED',
  ) {
    return this.promotionsService.findAll({ status, search, filterType });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.promotionsService.update(id, dto, user.id);
  }

  @Delete(':id')
  archive(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.promotionsService.archive(id, user.id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.promotionsService.restore(id, user.id);
  }
}
