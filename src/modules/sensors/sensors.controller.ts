import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { AuthGuard } from '@nestjs/passport';
import { CreateReadingDto } from './dto/create-reading.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { SensorReadingService } from './sensorReadings.service';
import { SensorType } from '@prisma/client';
import { SensorStatusResponse } from './entities/statusSensor.interface';

@UseGuards(AuthGuard('jwt'))
@Controller('sensors')
export class SensorsController {
  constructor(
    private readonly sensorsService: SensorsService,
    private readonly sensorReadingService: SensorReadingService,
  ) {}

  @Post('create')
  create(
    @Body() createSensorDto: CreateSensorDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.sensorsService.create(createSensorDto, user.userId);
  }

  @Get('status')
  async getSensorsStatus() {
    return await this.sensorsService.getStatusSensors();
  }

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('name') name?: string,
    @Query('status') status?: 'ONLINE' | 'OFFLINE' | 'EM ALERTA',
    @Query('type') type?: SensorType,
    @Query('location') location?: string,
    @Query('plantName') plantName?: string,
    @Query('orderBy') orderBy?: 'asc' | 'desc',
  ) {
    return this.sensorsService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      name,
      status,
      type,
      location,
      plantName,
      orderBy,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<SensorStatusResponse> {
    return this.sensorsService.findOne(+id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateSensorDto: UpdateSensorDto,
  ) {
    return this.sensorsService.update(+id, updateSensorDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.sensorsService.remove(+id);
    return { message: `O sensor de ID ${id} foi excluída com sucesso` };
  }

  //criação de leitura do sensor
  @Post('readings')
  @HttpCode(HttpStatus.CREATED)
  async createReading(@Body() createReadingDto: CreateReadingDto) {
    return this.sensorReadingService.create(createReadingDto);
  }

  @Get(':id/last-reading')
  async getLastReading(@Param('id', ParseIntPipe) id: number) {
    return this.sensorReadingService.findLastReadingSensor(id);
  }
}
