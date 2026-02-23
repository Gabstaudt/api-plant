import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail()  email?: string;
  @ApiPropertyOptional({ enum: ['ADMIN_MASTER','ADMIN','VIEWER'] })
  @IsOptional() @IsEnum(['ADMIN_MASTER','ADMIN','VIEWER'] as const) role?: 'ADMIN_MASTER' | 'ADMIN' | 'VIEWER';
  @ApiPropertyOptional({ enum: ['ATIVO','PENDENTE','BLOQUEADO','DELETADO'] })
  @IsOptional()
  @IsEnum(['ATIVO','PENDENTE','BLOQUEADO','DELETADO'] as const)
  status?: 'ATIVO' | 'PENDENTE' | 'BLOQUEADO' | 'DELETADO';
  @ApiPropertyOptional({ description: 'ISO date' })
  @IsOptional() @IsDateString() dateOfBirth?: string;
}
