import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail()  email?: string;
  @ApiPropertyOptional({ enum: ['ADMIN','VIEWER'] })
  @IsOptional() @IsEnum(['ADMIN','VIEWER'] as const) role?: 'ADMIN' | 'VIEWER';
  @ApiPropertyOptional({ description: 'ISO date' })
  @IsOptional() @IsDateString() dateOfBirth?: string;
}
