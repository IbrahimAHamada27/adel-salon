import { IsNotEmpty, IsString, IsOptional, IsIn, IsNumber, Min } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty({ message: 'اسم القسم مطلوب ولا يمكن تركه فارغاً' })
  @IsString({ message: 'اسم القسم يجب أن يكون نصياً' })
  name!: string;

  @IsOptional()
  @IsString()
  colorCode?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'HIDDEN', 'ARCHIVED'], { message: 'حالة القسم غير صالحة' })
  status?: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  colorCode?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'HIDDEN', 'ARCHIVED'])
  status?: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateGroupDto {
  @IsNotEmpty({ message: 'القسم الرئيسي التابع له مطلوب' })
  @IsString()
  categoryId!: string;

  @IsNotEmpty({ message: 'اسم المجموعة مطلوب ولا يمكن تركه فارغاً' })
  @IsString({ message: 'اسم المجموعة يجب أن يكون نصياً' })
  name!: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'HIDDEN', 'ARCHIVED'])
  status?: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'HIDDEN', 'ARCHIVED'])
  status?: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateServiceDto {
  @IsNotEmpty({ message: 'المجموعة التابعة لها مطلوبة' })
  @IsString()
  groupId!: string;

  @IsNotEmpty({ message: 'اسم الخدمة مطلوب ولا يمكن تركه فارغاً' })
  @IsString({ message: 'اسم الخدمة يجب أن يكون نصياً' })
  name!: string;

  @IsNotEmpty({ message: 'السعر الأساسي مطلوب' })
  @IsNumber({}, { message: 'السعر يجب أن يكون رقماً' })
  @Min(0, { message: 'السعر لا يمكن أن يكون سالباً' })
  price!: number;

  @IsOptional()
  allowPriceOverride?: boolean;

  @IsOptional()
  @IsIn(['ACTIVE', 'HIDDEN', 'ARCHIVED'])
  status?: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateProductDto {
  @IsNotEmpty({ message: 'المجموعة التابع لها مطلوبة' })
  @IsString()
  groupId!: string;

  @IsNotEmpty({ message: 'اسم المنتج مطلوب ولا يمكن تركه فارغاً' })
  @IsString({ message: 'اسم المنتج يجب أن يكون نصياً' })
  name!: string;

  @IsNotEmpty({ message: 'سعر بيع المنتج مطلوب' })
  @IsNumber({}, { message: 'السعر يجب أن يكون رقماً' })
  @Min(0, { message: 'السعر لا يمكن أن يكون سالباً' })
  price!: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'HIDDEN', 'ARCHIVED'])
  status?: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  allowPriceOverride?: boolean;

  @IsOptional()
  @IsIn(['ACTIVE', 'HIDDEN', 'ARCHIVED'])
  status?: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class ReorderDto {
  @IsNotEmpty({ message: 'اتجاه التحريك مطلوب' })
  @IsIn(['UP', 'DOWN'], { message: 'اتجاه التحريك يجب أن يكون UP أو DOWN' })
  direction!: 'UP' | 'DOWN';
}
