import {
  IsString,
  IsNumber,
  Min,
  IsOptional,
  IsIn,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PromotionItemInputDto } from './create-promotion.dto';

export class UpdatePromotionDto {
  @IsOptional()
  @IsString({ message: 'اسم العرض يجب أن يكون نصياً' })
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsNumber({}, { message: 'السعر الثابت يجب أن يكون رقماً' })
  @Min(0, { message: 'السعر الثابت لا يمكن أن يكون سالباً' })
  fixedPrice?: number;

  @IsOptional()
  @IsString()
  startsAt?: string | null;

  @IsOptional()
  @IsString()
  endsAt?: string | null;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'ARCHIVED'])
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsArray({ message: 'عناصر العرض يجب أن تكون مصفوفة' })
  @ValidateNested({ each: true })
  @Type(() => PromotionItemInputDto)
  items?: PromotionItemInputDto[];
}

