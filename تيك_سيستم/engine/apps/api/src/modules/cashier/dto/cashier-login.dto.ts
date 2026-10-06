import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsBoolean, Matches } from 'class-validator';

export class CashierLoginDto {
  @IsString()
  @IsNotEmpty({ message: 'اسم مستخدم الكاشير مطلوب' })
  @MaxLength(50)
  username!: string;

  @IsString()
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @MinLength(4, { message: 'كلمة المرور يجب أن لا تقل عن 4 خانات' })
  @MaxLength(100)
  password!: string;
}

export class ManageCashierAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'اسم الكاشير مطلوب' })
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'اسم المستخدم مطلوب' })
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'اسم المستخدم يجب أن يحتوي فقط على أحرف وأرقام وعلامات _ أو -' })
  username!: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(100)
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

