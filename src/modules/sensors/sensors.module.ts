import { Module } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { SensorsController } from './sensors.controller';
import { SensorReadingService } from './sensorReadings.service';

@Module({
  controllers: [SensorsController],
  providers: [SensorsService, SensorReadingService],
})
export class SensorsModule {}
