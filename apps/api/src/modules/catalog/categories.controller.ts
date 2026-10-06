import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto, ReorderDto } from './dto/catalog.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('catalog/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto, @CurrentUser('id') userId: string) {
    return this.categoriesService.create(dto, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @CurrentUser('id') userId: string) {
    return this.categoriesService.update(id, dto, userId);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.categoriesService.archive(id, userId);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.categoriesService.restore(id, userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.categoriesService.delete(id, userId);
  }

  @Post(':id/reorder')
  reorder(@Param('id') id: string, @Body() dto: ReorderDto, @CurrentUser('id') userId: string) {
    return this.categoriesService.reorder(id, dto.direction, userId);
  }
}
