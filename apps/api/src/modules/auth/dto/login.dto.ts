import { IsNotEmpty, IsString, MaxLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'اسم المستخدم مطلوب' })
  @IsString({ message: 'اسم المستخدم يجب أن يكون نصياً' })
  @MaxLength(50, { message: 'اسم المستخدم يجب ألا يتجاوز 50 حرفاً' })
  username!: string;

  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @IsString({ message: 'كلمة المرور مطلوبة' })
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

