import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: ['ADMIN','VIEWER'] })
  @IsEnum(['ADMIN','VIEWER'] as const)
  role!: 'ADMIN' | 'VIEWER';
}
