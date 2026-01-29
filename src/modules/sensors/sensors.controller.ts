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
} from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SensorReadingService } from './sensorReadings.service';
import { CreateReadingDto } from './dto/create-reading.dto';

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
    @GetUser() user: { userId: number },
  ) {
    return this.sensorsService.create(createSensorDto, user.userId);
  }

  @Get()
  findAll() {
    return this.sensorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sensorsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSensorDto: UpdateSensorDto) {
    return this.sensorsService.update(+id, updateSensorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sensorsService.remove(+id);
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
