import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto, ReorderDto } from './dto/catalog.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get('categories/:categoryId/groups')
  findByCategory(@Param('categoryId') categoryId: string) {
    return this.groupsService.findByCategory(categoryId);
  }

  @Get('groups/:id')
  findById(@Param('id') id: string) {
    return this.groupsService.findById(id);
  }

  @Post('groups')
  create(@Body() dto: CreateGroupDto, @CurrentUser('id') userId: string) {
    return this.groupsService.create(dto, userId);
  }

  @Patch('groups/:id')
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto, @CurrentUser('id') userId: string) {
    return this.groupsService.update(id, dto, userId);
  }

  @Post('groups/:id/archive')
  archive(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.groupsService.archive(id, userId);
  }

  @Post('groups/:id/restore')
  restore(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.groupsService.restore(id, userId);
  }

  @Delete('groups/:id')
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.groupsService.delete(id, userId);
  }

  @Post('groups/:id/reorder')
  reorder(@Param('id') id: string, @Body() dto: ReorderDto, @CurrentUser('id') userId: string) {
    return this.groupsService.reorder(id, dto.direction, userId);
  }
}
