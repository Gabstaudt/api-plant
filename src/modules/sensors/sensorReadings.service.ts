import { Injectable, NotFoundException } from '@nestjs/common';
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
    let statusReading: StatusReading = StatusReading.NORMAL;

    if (plant) {
      switch (type.toUpperCase()) {
        case 'TEMPERATURE':
          min = plant.tempMin ? Number(plant.tempMin) : null;
          max = plant.tempMax ? Number(plant.tempMax) : null;
          break;
        case 'HUMIDITTY':
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
        default: {
          const idealRange = plant.idealRanges?.find(
            (range: PlantIdealRange) =>
              range.type.toUpperCase() === type.toUpperCase(),
          );
          if (!idealRange || (!idealRange.min && !idealRange.max)) {
            statusReading = StatusReading.NORMAL;
          } else {
            min = idealRange.min ? Number(idealRange.min) : null;
            max = idealRange.max ? Number(idealRange.max) : null;
          }
          break;
        }
      }
    }
    // Lógica de estado CRÍTICO (Fora dos limites)
    if ((min !== null && value < min) || (max !== null && value > max)) {
      statusReading = StatusReading.CRITICO;
    }

    // Lógica de estado ATENÇÃO (Dentro dos limites, mas próximo das bordas)
    // Definimos uma margem de 10% do intervalo total ou uma constante fixa
    if (min !== null && max !== null) {
      const rangeSpan = max - min;
      const margin = rangeSpan * 0.1; // 10% de margem de segurança

      if (value <= min + margin || value >= max - margin) {
        statusReading = StatusReading.ATENCAO;
      }
    }

    return statusReading;
  }

  async create(createReadingDto: CreateReadingDto) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { hardwareId: createReadingDto.hardwareId },
      include: {
        plant: { include: { idealRanges: true } },
        readings: { take: 1, orderBy: { createdAt: 'desc' } }, // Adicione isso!
      },
    });

    if (!sensor) {
      throw new NotFoundException('Sensor não identificado pelo Hardware ID');
    }

    let status: StatusReading = StatusReading.NORMAL;

    if (sensor.plant && sensor.plant.idealRanges.length > 0) {
      status = this.validateReadingAgainstPlant(
        Number(createReadingDto.value),
        sensor,
      );
    }

    return this.prisma.sensorReadings.create({
      data: {
        sensorId: sensor.id,
        value: createReadingDto.value,
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
