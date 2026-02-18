import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class ApproveRequestDto {
  @ApiPropertyOptional({ enum: ['ADMIN','VIEWER'] })
  @IsOptional()
  @IsEnum(['ADMIN','VIEWER'] as const)
  role?: 'ADMIN' | 'VIEWER';
}
