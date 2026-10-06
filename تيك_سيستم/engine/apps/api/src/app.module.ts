import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { CashierModule } from './modules/cashier/cashier.module';
import { HealthModule } from './modules/health/health.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { SalesModule } from './modules/sales/sales.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    AuditLogModule,
    UsersModule,
    AuthModule,
    CatalogModule,
    EmployeesModule,
    CashierModule,
    PromotionsModule,
    BookingsModule,
    SalesModule,
    ExpensesModule,
    ShiftsModule,
    ReportsModule,
    CustomersModule,
    SettingsModule,
    HealthModule,
  ],
})
export class AppModule {}

