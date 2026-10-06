import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateServiceDto, CreateProductDto, UpdateItemDto, ReorderDto } from './dto/catalog.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get('items')
  findAll() {
    return this.itemsService.findAll();
  }

  @Get('groups/:groupId/items')
  findByGroup(@Param('groupId') groupId: string) {
    return this.itemsService.findByGroup(groupId);
  }

  @Get('items/:id')
  findById(@Param('id') id: string) {
    return this.itemsService.findById(id);
  }

  @Post('items/service')
  createService(@Body() dto: CreateServiceDto, @CurrentUser('id') userId: string) {
    return this.itemsService.createService(dto, userId);
  }

  @Post('items/product')
  createProduct(@Body() dto: CreateProductDto, @CurrentUser('id') userId: string) {
    return this.itemsService.createProduct(dto, userId);
  }

  @Patch('items/:id')
  update(@Param('id') id: string, @Body() dto: UpdateItemDto, @CurrentUser('id') userId: string) {
    return this.itemsService.update(id, dto, userId);
  }

  @Post('items/:id/archive')
  archive(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.itemsService.archive(id, userId);
  }

  @Post('items/:id/restore')
  restore(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.itemsService.restore(id, userId);
  }

  @Delete('items/:id')
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.itemsService.delete(id, userId);
  }

  @Post('items/:id/reorder')
  reorder(@Param('id') id: string, @Body() dto: ReorderDto, @CurrentUser('id') userId: string) {
    return this.itemsService.reorder(id, dto.direction, userId);
  }
}
