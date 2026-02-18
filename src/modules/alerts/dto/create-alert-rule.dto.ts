import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { AlertCondition, AlertSeverity } from '@prisma/client';

export class CreateAlertRuleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  measurementType!: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ enum: AlertCondition })
  @IsEnum(AlertCondition)
  condition!: AlertCondition;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  threshold?: number;

  @ApiProperty({ enum: AlertSeverity })
  @IsEnum(AlertSeverity)
  severity!: AlertSeverity;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @IsOptional()
  sensorIds?: number[];
}
