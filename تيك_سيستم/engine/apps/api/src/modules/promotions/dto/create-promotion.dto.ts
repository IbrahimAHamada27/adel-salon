import {
  IsNotEmpty,
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

export class PromotionItemInputDto {
  @IsNotEmpty({ message: 'معرف عنصر الكتالوج مطلوب' })
  @IsString()
  @MaxLength(100)
  catalogItemId!: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'الكمية يجب أن تكون 1 على الأقل' })
  quantity?: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreatePromotionDto {
  @IsNotEmpty({ message: 'اسم العرض مطلوب' })
  @IsString({ message: 'اسم العرض يجب أن يكون نصياً' })
  @MaxLength(150, { message: 'اسم العرض يجب ألا يتجاوز 150 حرفاً' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsNotEmpty({ message: 'السعر الثابت للعرض مطلوب' })
  @IsNumber({}, { message: 'السعر الثابت يجب أن يكون رقماً' })
  @Min(0, { message: 'السعر الثابت لا يمكن أن يكون سالباً' })
  fixedPrice!: number;

  @IsOptional()
  @IsString()
  startsAt?: string | null;

  @IsOptional()
  @IsString()
  endsAt?: string | null;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsArray({ message: 'عناصر العرض يجب أن تكون مصفوفة' })
  @ValidateNested({ each: true })
  @Type(() => PromotionItemInputDto)
  items!: PromotionItemInputDto[];
}

