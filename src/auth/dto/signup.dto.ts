import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { Role } from '../../users/user.entity.js';

export class SignupDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt only uses the first 72 bytes
  password: string;

  // Demo only: lets you create an admin to try the @Roles('admin') route.
  // A real app would never let clients pick their own role.
  @ApiPropertyOptional({ enum: ['user', 'admin'], default: 'user' })
  @IsOptional()
  @IsIn(['user', 'admin'])
  role?: Role;
}
