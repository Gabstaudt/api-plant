import { ApiProperty } from '@nestjs/swagger';
import { SensorType } from '@prisma/client';

import {
  IsBoolean,
  IsEnum,
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

  @ApiProperty({ enum: SensorType })
  @IsNotEmpty()
  @IsEnum(SensorType, { message: 'Tipo de sensor inválido' })
  type!: SensorType;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  location!: string;

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
