import { IsNotEmpty, IsString, IsNumber, Min, IsOptional, MaxLength } from 'class-validator';

export class CreateExpenseDto {
  @IsNotEmpty({ message: 'تصنيف المصروف مطلوب' })
  @IsString()
  @MaxLength(100)
  category!: string;

  @IsNotEmpty({ message: 'المبلغ مطلوب' })
  @IsNumber({}, { message: 'المبلغ يجب أن يكون رقماً' })
  @Min(0.01, { message: 'المبلغ يجب أن يكون أكبر من صفر' })
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
