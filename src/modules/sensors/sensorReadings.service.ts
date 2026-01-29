import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReadingDto } from './dto/create-reading.dto';
import { SensorReadingEntity } from './entities/sensorReading.entity';

@Injectable()
export class SensorReadingService {
  constructor(private prisma: PrismaService) {}

  async create(createReadingDto: CreateReadingDto) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { hardwareId: createReadingDto.hardwareId },
    });

    if (!sensor) {
      throw new NotFoundException('Sensor não identificado pelo Hardware ID');
    }

    const reading = new SensorReadingEntity(createReadingDto);

    return this.prisma.sensorReadings.create({
      data: {
        sensorId: sensor.id,
        value: reading.value,
      },
    });
  }

  async findLastReadingSensor(sensorId: number) {
    const lastReading = await this.prisma.sensor.findUnique({
      where: { id: sensorId },
      include: {
        readings: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!lastReading) {
      throw new NotFoundException(
        'Nenhuma leitura encontrada para esse sensor',
      );
    }
    return lastReading;
  }
}
