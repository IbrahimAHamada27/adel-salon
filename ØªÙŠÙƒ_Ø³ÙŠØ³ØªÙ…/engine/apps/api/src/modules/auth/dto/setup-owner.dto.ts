import { IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, IsEmail, Matches } from 'class-validator';

export class SetupOwnerDto {
  @IsNotEmpty({ message: 'الاسم مطلوب' })
  @IsString({ message: 'الاسم يجب أن يكون نصياً' })
  @MaxLength(100, { message: 'الاسم يجب ألا يتجاوز 100 حرف' })
  name!: string;

  @IsNotEmpty({ message: 'اسم المستخدم مطلوب' })
  @IsString({ message: 'اسم المستخدم يجب أن يكون نصياً' })
  @MinLength(3, { message: 'اسم المستخدم يجب ألا يقل عن 3 أحرف' })
  @MaxLength(50, { message: 'اسم المستخدم يجب ألا يتجاوز 50 حرفاً' })
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'اسم المستخدم يجب أن يحتوي فقط على أحرف إنجليزية وأرقام وعلامات _ أو -' })
  username!: string;

  @IsOptional()
  @IsEmail({}, { message: 'صيغة البريد الإلكتروني غير صحيحة' })
  @MaxLength(255, { message: 'البريد الإلكتروني يجب ألا يتجاوز 255 حرفاً' })
  email?: string;

  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @IsString({ message: 'كلمة المرور يجب أن تكون نصية' })
  @MinLength(8, { message: 'كلمة المرور يجب ألا تقل عن 8 خانات' })
  @MaxLength(100, { message: 'كلمة المرور يجب ألا تتجاوز 100 خانة' })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  captchaChallengeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  captchaSolution?: string;
}

