import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReadingDto } from './dto/create-reading.dto';
import { SensorReadingEntity } from './entities/sensorReading.entity';
import { PlantIdealRange, Prisma, StatusReading } from '@prisma/client';

type SensorWithPlant = Prisma.SensorGetPayload<{
  include: {
    plant: {
      include: {
        idealRanges: true;
      };
    };
    readings: true;
  };
}>;

@Injectable()
export class SensorReadingService {
  constructor(private prisma: PrismaService) {}

  private validateReadingAgainstPlant(
    value: number,
    sensor: SensorWithPlant,
  ): StatusReading {
    const { type, plant } = sensor;
    let min: number | null = null;
    let max: number | null = null;
    const statusReading: StatusReading = StatusReading.NORMAL;

    const idealRange = plant?.idealRanges?.find(
      (range: PlantIdealRange) =>
        range.type.toUpperCase() === type.toUpperCase(),
    );

    //validação de unidades
    if (plant) {
      switch (type.toUpperCase()) {
        case 'TEMPERATURE':
          min = plant.tempMin ? Number(plant.tempMin) : null;
          max = plant.tempMax ? Number(plant.tempMax) : null;
          break;
        case 'HUMIDITY':
          min = plant.umiMin ? Number(plant.umiMin) : null;
          max = plant.umiMax ? Number(plant.umiMax) : null;
          break;
        case 'PH':
          min = plant.phMin ? Number(plant.phMin) : null;
          max = plant.phMax ? Number(plant.phMax) : null;
          break;
        case 'LIGHT':
          min = plant.lightMin ? Number(plant.lightMin) : null;
          max = plant.lightMax ? Number(plant.lightMax) : null;
          break;
        default:
          if (idealRange) {
            min = idealRange.min ? Number(idealRange.min) : null;
            max = idealRange.max ? Number(idealRange.max) : null;
          }
          break;
      }
    }

    if ((min !== null && value < min) || (max !== null && value > max)) {
      return StatusReading.CRITICO;
    }

    if (min !== null && max !== null) {
      const margin = (max - min) * 0.1;
      if (value <= min + margin || value >= max - margin) {
        return StatusReading.ATENCAO;
      }
    }

    return statusReading;
  }

  async create(createReadingDto: CreateReadingDto) {
    const reading = new SensorReadingEntity(createReadingDto);
    const sensor = await this.prisma.sensor.findUnique({
      where: { id: reading.sensorId },
      include: {
        plant: { include: { idealRanges: true } },
        readings: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!sensor) throw new NotFoundException('Sensor não identificado');

    let status: StatusReading = StatusReading.NORMAL;

    if (sensor.plant) {
      status = this.validateReadingAgainstPlant(Number(reading.value), sensor);
    }

    return this.prisma.sensorReadings.create({
      data: {
        ...reading,
        statusReading: status,
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
