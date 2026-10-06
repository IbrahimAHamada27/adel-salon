import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'كلمة المرور الحالية مطلوبة' })
  @IsString()
  currentPassword!: string;

  @IsNotEmpty({ message: 'كلمة المرور الجديدة مطلوبة' })
  @IsString()
  @MinLength(8, { message: 'كلمة المرور الجديدة يجب ألا تقل عن 8 خانات' })
  @MaxLength(100)
  newPassword!: string;
}

export class UpdateProfileDto {
  @IsNotEmpty({ message: 'الاسم مطلوب' })
  @IsString()
  @MaxLength(100)
  name!: string;
}
