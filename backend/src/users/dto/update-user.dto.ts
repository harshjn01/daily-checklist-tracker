import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role, UserStatus } from '../../types/enums';

export class UpdateUserDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @IsOptional()
  password?: string;

  @IsEnum(Role, { message: 'Role must be ADMIN or USER' })
  @IsOptional()
  role?: Role;

  @IsEnum(UserStatus, { message: 'Status must be ACTIVE, INACTIVE, or PENDING_INVITE' })
  @IsOptional()
  status?: UserStatus;
}
