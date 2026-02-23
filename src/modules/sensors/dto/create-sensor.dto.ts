import { ApiProperty } from '@nestjs/swagger';

import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSensorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sensorName!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  hardwareId!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  type!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  unit!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  alertsEnabled!: boolean;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  plantId?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  readingIntervalSeconds?: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  notes?: string;
}
