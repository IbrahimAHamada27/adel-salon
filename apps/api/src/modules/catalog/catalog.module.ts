import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';

@Module({
  controllers: [CategoriesController, GroupsController, ItemsController],
  providers: [CategoriesService, GroupsService, ItemsService],
  exports: [CategoriesService, GroupsService, ItemsService],
})
export class CatalogModule {}
