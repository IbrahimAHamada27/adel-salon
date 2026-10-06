import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { CatalogModule } from './catalog.module';
import { CategoriesService } from './categories.service';
import { GroupsService } from './groups.service';
import { ItemsService } from './items.service';
import { DatabaseService } from '../database/database.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';

describe('CatalogModule Tests (Hierarchy & Business Rules)', () => {
  let categoriesService: CategoriesService;
  let groupsService: GroupsService;
  let itemsService: ItemsService;
  let dbService: DatabaseService;
  const testDbFile = './data/test_catalog.sqlite';

  beforeAll(async () => {
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ DATABASE_FILE: testDbFile })],
        }),
        DatabaseModule,
        AuditLogModule,
        CatalogModule,
      ],
    }).compile();

    categoriesService = moduleRef.get<CategoriesService>(CategoriesService);
    groupsService = moduleRef.get<GroupsService>(GroupsService);
    itemsService = moduleRef.get<ItemsService>(ItemsService);
    dbService = moduleRef.get<DatabaseService>(DatabaseService);
  });

  afterAll(() => {
    if (dbService) {
      dbService.onModuleDestroy();
    }
    if (fs.existsSync(testDbFile)) {
      try { fs.unlinkSync(testDbFile); } catch {}
    }
  });

  it('1. Database should start with empty catalog (Zero Seed Data)', () => {
    const categories = categoriesService.findAll();
    expect(categories).toEqual([]);
  });

  it('2. Should successfully create a Category', () => {
    const cat = categoriesService.create({
      name: 'قسم الشعر',
      colorCode: '#059669',
      status: 'ACTIVE',
    });

    expect(cat.id).toBeDefined();
    expect(cat.name).toBe('قسم الشعر');
    expect(cat.groupCount).toBe(0);

    const all = categoriesService.findAll();
    expect(all.length).toBe(1);
  });

  it('3. Should NOT allow creating Group with non-existent Category ID', () => {
    expect(() => {
      groupsService.create({
        categoryId: 'non_existent_category_id',
        name: 'مجموعة بدون قسم',
        status: 'ACTIVE',
      });
    }).toThrow(NotFoundException);
  });

  it('4. Should successfully create Group inside Category', () => {
    const categories = categoriesService.findAll();
    const parentCat = categories[0];

    const grp = groupsService.create({
      categoryId: parentCat.id,
      name: 'مجموعة القص والتصفيف',
      status: 'ACTIVE',
    });

    expect(grp.id).toBeDefined();
    expect(grp.categoryId).toBe(parentCat.id);
    expect(grp.itemCount).toBe(0);

    const groupsInCat = groupsService.findByCategory(parentCat.id);
    expect(groupsInCat.length).toBe(1);

    const catWithCount = categoriesService.findById(parentCat.id);
    expect(catWithCount.groupCount).toBe(1);
  });

  it('5. Should NOT allow creating CatalogItem with non-existent Group ID', () => {
    expect(() => {
      itemsService.createService({
        groupId: 'non_existent_group_id',
        name: 'قص كلاسيك',
        price: 100,
        status: 'ACTIVE',
      });
    }).toThrow(NotFoundException);
  });

  it('6. Should successfully create Service and Product inside Group', () => {
    const categories = categoriesService.findAll();
    const groups = groupsService.findByCategory(categories[0].id);
    const parentGroup = groups[0];

    const service = itemsService.createService({
      groupId: parentGroup.id,
      name: 'قص شعر ملكي',
      price: 120,
      allowPriceOverride: true,
      status: 'ACTIVE',
    });

    expect(service.type).toBe('SERVICE');
    expect(service.price).toBe(120);
    expect(service.allowPriceOverride).toBe(true);

    const product = itemsService.createProduct({
      groupId: parentGroup.id,
      name: 'سيروم لحية',
      price: 80,
      sku: 'SRM-01',
      status: 'ACTIVE',
    });

    expect(product.type).toBe('PRODUCT');
    expect(product.price).toBe(80);
    expect(product.sku).toBe('SRM-01');

    const items = itemsService.findByGroup(parentGroup.id);
    expect(items.length).toBe(2);

    const groupWithCount = groupsService.findById(parentGroup.id);
    expect(groupWithCount.itemCount).toBe(2);
  });

  it('7. Should NOT allow deleting Category that contains Groups', () => {
    const categories = categoriesService.findAll();
    const parentCat = categories[0];

    expect(() => {
      categoriesService.delete(parentCat.id);
    }).toThrow(BadRequestException);
  });

  it('8. Should NOT allow deleting Group that contains Catalog Items', () => {
    const categories = categoriesService.findAll();
    const groups = groupsService.findByCategory(categories[0].id);
    const parentGroup = groups[0];

    expect(() => {
      groupsService.delete(parentGroup.id);
    }).toThrow(BadRequestException);
  });

  it('9. Should support Archiving and Restoring at all levels', () => {
    const categories = categoriesService.findAll();
    const cat = categories[0];
    const archivedCat = categoriesService.archive(cat.id);
    expect(archivedCat.status).toBe('ARCHIVED');

    const restoredCat = categoriesService.restore(cat.id);
    expect(restoredCat.status).toBe('ACTIVE');
  });

  it('10. Should support Reordering items safely', () => {
    const categories = categoriesService.findAll();
    const groups = groupsService.findByCategory(categories[0].id);
    const items = itemsService.findByGroup(groups[0].id);

    expect(items.length).toBe(2);
    const firstItem = items[0];
    const secondItem = items[1];

    // Reorder first item down
    const reordered = itemsService.reorder(firstItem.id, 'DOWN');
    expect(reordered[0].id).toBe(secondItem.id);
    expect(reordered[1].id).toBe(firstItem.id);
  });
});
