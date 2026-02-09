import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateReadingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  hardwareId!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  value!: number;
}
