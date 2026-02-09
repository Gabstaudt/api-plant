import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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
  @IsNumber()
  @IsOptional()
  tempMax?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  tempMin?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  umiMax?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  umiMin?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  lightMax?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  lightMin?: number;

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
}
