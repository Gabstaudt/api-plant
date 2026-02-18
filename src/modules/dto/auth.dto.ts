import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty() @IsString() fullName!: string;
  @ApiProperty() @IsEmail()  email!: string;
  @ApiProperty({ minLength: 6 }) @IsString() @MinLength(6) password!: string;
  @ApiPropertyOptional({ description: 'ISO date' })
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ecosystemCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ecosystemName?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isMasterAdmin?: boolean;
}

export class LoginDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() password!: string;
}
