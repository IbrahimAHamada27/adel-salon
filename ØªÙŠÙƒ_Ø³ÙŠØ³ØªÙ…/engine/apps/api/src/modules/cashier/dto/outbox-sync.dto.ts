import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SyncCustomerDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string | null;

  @IsString()
  @IsOptional()
  birthDate?: string | null;

  @IsString()
  @IsOptional()
  internalNote?: string | null;

  @IsString()
  @IsOptional()
  createdAt?: string;
}

export class SyncShiftDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsOptional()
  operationId?: string;

  @IsString()
  @IsNotEmpty()
  cashierId!: string;

  @IsString()
  @IsNotEmpty()
  status!: 'OPEN' | 'CLOSED';

  @IsString()
  @IsNotEmpty()
  openedAt!: string;

  @IsString()
  @IsOptional()
  closedAt?: string | null;

  @IsNumber()
  openingBalance!: number;

  @IsNumber()
  expectedCash!: number;

  @IsNumber()
  @IsOptional()
  actualCash?: number | null;

  @IsNumber()
  @IsOptional()
  cashDifference?: number;

  @IsString()
  @IsOptional()
  notes?: string | null;

  @IsString()
  @IsOptional()
  createdAt?: string;
}

export class SyncInvoiceLineDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsOptional()
  catalogItemId?: string | null;

  @IsString()
  @IsNotEmpty()
  itemNameSnapshot!: string;

  @IsString()
  @IsNotEmpty()
  itemType!: 'SERVICE' | 'PRODUCT' | 'PROMOTION';

  @IsNumber()
  unitPrice!: number;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  totalPrice!: number;

  @IsString()
  @IsOptional()
  barberEmployeeId?: string | null;

  @IsString()
  @IsOptional()
  parentPromotionId?: string | null;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class SyncPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentMethod!: string;

  @IsNumber()
  amount!: number;

  @IsNumber()
  @IsOptional()
  cashReceivedAmount?: number | null;

  @IsNumber()
  @IsOptional()
  changeAmount?: number | null;

  @IsString()
  @IsOptional()
  referenceNote?: string | null;
}

export class SyncInvoiceDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsOptional()
  operationId?: string;

  @IsString()
  @IsOptional()
  shiftId?: string | null;

  @IsString()
  @IsNotEmpty()
  cashierId!: string;

  @IsString()
  @IsOptional()
  customerId?: string | null;

  @IsString()
  @IsOptional()
  customerNameSnapshot?: string | null;

  @IsString()
  @IsOptional()
  customerPhoneSnapshot?: string | null;

  @IsString()
  @IsNotEmpty()
  invoiceNumber!: string;

  @IsNumber()
  subtotal!: number;

  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @IsNumber()
  totalAmount!: number;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsNotEmpty()
  status!: 'PAID' | 'CANCELLED' | 'DRAFT' | 'SUSPENDED';

  @IsString()
  @IsOptional()
  notes?: string | null;

  @IsString()
  @IsNotEmpty()
  createdAt!: string;

  @IsString()
  @IsOptional()
  paidAt?: string | null;

  @IsNumber()
  @IsOptional()
  tipAmount?: number | null;

  @IsString()
  @IsOptional()
  tipRecipientEmployeeId?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncInvoiceLineDto)
  lines!: SyncInvoiceLineDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SyncPaymentDto)
  payments?: SyncPaymentDto[];
}

export class SyncExpenseDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsOptional()
  operationId?: string;

  @IsString()
  @IsOptional()
  shiftId?: string | null;

  @IsString()
  @IsNotEmpty()
  cashierId!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsString()
  @IsNotEmpty()
  createdAt!: string;
}

export class OutboxSyncDto {
  @IsString()
  @IsOptional()
  syncId?: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SyncCustomerDto)
  customers?: SyncCustomerDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SyncShiftDto)
  shifts?: SyncShiftDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SyncInvoiceDto)
  invoices?: SyncInvoiceDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SyncExpenseDto)
  expenses?: SyncExpenseDto[];
}
