import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingItemInputDto } from './create-booking.dto';

export class UpdateBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  guestName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  guestPhone?: string | null;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  preferredEmployeeId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  internalNote?: string | null;

  @IsOptional()
  @IsIn(['CONFIRMED', 'ARRIVED', 'NO_SHOW', 'CANCELLED', 'CONVERTED_TO_INVOICE'])
  status?: 'CONFIRMED' | 'ARRIVED' | 'NO_SHOW' | 'CANCELLED' | 'CONVERTED_TO_INVOICE';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  convertedInvoiceId?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingItemInputDto)
  items?: BookingItemInputDto[];
}

