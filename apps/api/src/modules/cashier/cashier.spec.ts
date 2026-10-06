import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import { CashierModule } from './cashier.module';
import { CashierService } from './cashier.service';
import { EmployeesModule } from '../employees/employees.module';
import { EmployeesService } from '../employees/employees.service';
import { CategoriesService } from '../catalog/categories.service';
import { GroupsService } from '../catalog/groups.service';
import { ItemsService } from '../catalog/items.service';
import { CatalogModule } from '../catalog/catalog.module';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

describe('CashierModule Integration & Role Separation Tests', () => {
  let moduleRef: TestingModule;
  let authService: AuthService;
  let usersService: UsersService;
  let cashierService: CashierService;
  let employeesService: EmployeesService;
  let categoriesService: CategoriesService;
  let groupsService: GroupsService;
  let itemsService: ItemsService;
  let dbService: DatabaseService;
  const testDbFile = './data/test_cashier_spec.sqlite';

  beforeAll(async () => {
    process.env.DATABASE_FILE = testDbFile;
    const resolvedPath = path.resolve(process.cwd(), testDbFile);
    if (fs.existsSync(resolvedPath)) {
      try {
        fs.unlinkSync(resolvedPath);
      } catch {}
    }

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({
          secret: 'test-secret-key-12345678901234567890',
          signOptions: { expiresIn: '1h' },
        }),
        DatabaseModule,
        AuditLogModule,
        UsersModule,
        AuthModule,
        CatalogModule,
        EmployeesModule,
        CashierModule,
      ],
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
    usersService = moduleRef.get<UsersService>(UsersService);
    cashierService = moduleRef.get<CashierService>(CashierService);
    employeesService = moduleRef.get<EmployeesService>(EmployeesService);
    categoriesService = moduleRef.get<CategoriesService>(CategoriesService);
    groupsService = moduleRef.get<GroupsService>(GroupsService);
    itemsService = moduleRef.get<ItemsService>(ItemsService);
    dbService = moduleRef.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    await moduleRef.close();
    const resolvedPath = path.resolve(process.cwd(), testDbFile);
    if (fs.existsSync(resolvedPath)) {
      try {
        fs.unlinkSync(resolvedPath);
      } catch {}
    }
  });

  let ownerId: string;
  let cashierId: string;

  it('1. Should setup the Owner account', async () => {
    const res = await authService.setupFirstOwner({
      name: 'صاحب الصالون',
      username: 'owner_boss',
      password: 'OwnerPassword123!',
    });
    expect(res.user.role).toBe('OWNER');
    ownerId = res.user.id;
  });

  it('2. Owner CANNOT login via Cashier Login endpoint', async () => {
    await expect(
      authService.cashierLogin({
        username: 'owner_boss',
        password: 'OwnerPassword123!',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('3. Should create a Cashier account by Owner', async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('CashierPass123', salt);

    const cashier = usersService.createOrUpdateCashier({
      name: 'كاشير الفرع الأول',
      username: 'cashier_1',
      passwordHash,
      isActive: true,
    });

    expect(cashier.role).toBe('CASHIER');
    expect(cashier.is_active).toBe(1);
    cashierId = cashier.id;
  });

  it('4. Cashier CANNOT login via Admin Owner Login endpoint', async () => {
    await expect(
      authService.login({
        username: 'cashier_1',
        password: 'CashierPass123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('5. Cashier CAN successfully login via Cashier Login endpoint', async () => {
    const res = await authService.cashierLogin({
      username: 'cashier_1',
      password: 'CashierPass123',
    });

    expect(res.user.role).toBe('CASHIER');
    expect(res.user.username).toBe('cashier_1');
    expect(res.token).toBeDefined();

    const dbUser = usersService.findById(cashierId);
    expect(dbUser?.last_login_at).toBeDefined();
  });

  it('6. Inactive/Disabled Cashier CANNOT login to Cashier app', async () => {
    usersService.createOrUpdateCashier({
      name: 'كاشير الفرع الأول',
      username: 'cashier_1',
      isActive: false,
    });

    await expect(
      authService.cashierLogin({
        username: 'cashier_1',
        password: 'CashierPass123',
      }),
    ).rejects.toThrow(UnauthorizedException);

    // Re-enable cashier for remaining tests
    usersService.createOrUpdateCashier({
      name: 'كاشير الفرع الأول',
      username: 'cashier_1',
      isActive: true,
    });
  });

  it('7. Catalog Snapshot should return ONLY active categories, groups, and items in correct sort order', async () => {
    // 1. Create 2 categories: Category 1 (Active), Category 2 (Archived)
    const cat1 = categoriesService.create({ name: 'قسم العناية بالشعر', colorCode: '#3b82f6' }, ownerId);
    const cat2 = categoriesService.create({ name: 'قسم مؤرشف قديم' }, ownerId);
    categoriesService.archive(cat2.id, ownerId);

    // 2. Create groups in Cat 1: Group 1 (Active), Group 2 (Archived)
    const grp1 = groupsService.create({ categoryId: cat1.id, name: 'قص وتصفيف' }, ownerId);
    const grp2 = groupsService.create({ categoryId: cat1.id, name: 'مجموعة ملغية' }, ownerId);
    groupsService.archive(grp2.id, ownerId);

    // 3. Create items in Group 1: Service 1 (Active), Service 2 (Archived), Product 1 (Active)
    const item1 = itemsService.createService(
      { groupId: grp1.id, name: 'قص شعر كلاسيكي', price: 50 },
      ownerId,
    );
    const item2 = itemsService.createService(
      { groupId: grp1.id, name: 'خدمة قديمة مؤرشفة', price: 90 },
      ownerId,
    );
    itemsService.archive(item2.id, ownerId);

    const item3 = itemsService.createProduct(
      { groupId: grp1.id, name: 'واكس للشعر فاخر', price: 75, sku: 'WAX-01' },
      ownerId,
    );

    // 4. Request snapshot
    const snapshot = cashierService.getCatalogSnapshot();

    expect(snapshot.categories.length).toBe(1);
    expect(snapshot.categories[0].name).toBe('قسم العناية بالشعر');

    expect(snapshot.groups.length).toBe(1);
    expect(snapshot.groups[0].name).toBe('قص وتصفيف');

    expect(snapshot.items.length).toBe(2);
    expect(snapshot.items.map((i) => i.name)).toContain('قص شعر كلاسيكي');
    expect(snapshot.items.map((i) => i.name)).toContain('واكس للشعر فاخر');
    expect(snapshot.items.map((i) => i.name)).not.toContain('خدمة قديمة مؤرشفة');
  });

  it('8. Employees Snapshot should return ONLY active staff members', async () => {
    const emp1 = employeesService.create({ name: 'أحمد الحلاق', roleTitle: 'حلاق محترف' }, ownerId);
    const emp2 = employeesService.create({ name: 'محمود المساعد', roleTitle: 'مساعد' }, ownerId);
    employeesService.archive(emp2.id, ownerId);

    const snapshot = cashierService.getEmployeesSnapshot();
    expect(snapshot.count).toBe(1);
    expect(snapshot.employees[0].name).toBe('أحمد الحلاق');
  });
});
