import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  IsNumber,
  Min,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BookingItemInputDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  catalogItemId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  promotionId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsIn(['SERVICE', 'PRODUCT', 'PROMOTION'])
  itemType?: 'SERVICE' | 'PRODUCT' | 'PROMOTION';

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class NewCustomerInputDto {
  @IsNotEmpty({ message: 'اسم العميل مطلوب' })
  @IsString()
  @MaxLength(100)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  internalNote?: string;
}

export class CreateBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => NewCustomerInputDto)
  newCustomer?: NewCustomerInputDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  guestName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  guestPhone?: string | null;

  @IsNotEmpty({ message: 'موعد الحجز مطلوب' })
  @IsString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  preferredEmployeeId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  internalNote?: string | null;

  @IsOptional()
  @IsIn(['CONFIRMED', 'ARRIVED', 'NO_SHOW', 'CANCELLED'])
  status?: 'CONFIRMED' | 'ARRIVED' | 'NO_SHOW' | 'CANCELLED';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingItemInputDto)
  items?: BookingItemInputDto[];

  @IsOptional()
  @IsIn(['ADMIN', 'CASHIER'])
  createdFrom?: 'ADMIN' | 'CASHIER';
}

