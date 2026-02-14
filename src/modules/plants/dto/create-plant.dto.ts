import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlantIdealRangeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  min?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  max?: number;
}

export class CreatePlantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  plantName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  species!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  location!: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  tempUnit?: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  tempMax?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  tempMin?: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  umiUnit?: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  umiMax?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  umiMin?: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  lightUnit?: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  lightMax?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  lightMin?: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phUnit?: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  phMax?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  phMin?: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  notesConditions?: string;

  @ApiProperty({ type: [CreatePlantIdealRangeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePlantIdealRangeDto)
  @IsOptional()
  idealRanges?: CreatePlantIdealRangeDto[];
}
