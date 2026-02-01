import { Injectable } from '@nestjs/common';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlantEntity } from './entities/plant.entity';
import { PlantStatusResponse } from './entities/statusPlants.insterface';
import { SensorType } from '@prisma/client';

@Injectable()
export class PlantsService {
  constructor(private prisma: PrismaService) {}

  // criação de uma planta, conectando a um usuário
  async create(createPlantDto: CreatePlantDto, userId: number) {
    const plant = new PlantEntity(createPlantDto);
    return this.prisma.plant.create({
      data: {
        ...plant,
        user: {
          connect: { id: userId },
        },
      },
    });
  }

  //retorno de todas as plantas
  findAll() {
    return this.prisma.plant.findMany();
  }

  findOne(id: number) {
    return `This action returns a #${id} plant`;
  }

  update(id: number, updatePlantDto: UpdatePlantDto) {
    return `This action updates a #${id} plant`;
  }

  remove(id: number) {
    return `This action removes a #${id} plant`;
  }

  //função para remover nulos
  private removeNulls<T>(obj: any): T {
    Object.keys(obj).forEach((key) => {
      if (obj[key] === null || obj[key] === undefined) {
        delete obj[key];
      }
    });
    return obj as T;
  }

  async getStatusPlants(): Promise<{ data: PlantStatusResponse[] }> {
    const now = new Date();

    const plants = await this.prisma.plant.findMany({
      include: {
        sensors: {
          include: {
            readings: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const result = plants.map((plant) => {
      const alerts: string[] = [];
      let onlineCount = 0;
      let alertCount = 0;

      plant.sensors.forEach((sensor) => {
        const lastReading = sensor.readings[0];

        const interval = sensor.readingIntervalSeconds ?? 60;
        const tolerance = (interval + 60) * 1000;
        const isOnline = lastReading
          ? new Date(lastReading.createdAt).getTime() >
            now.getTime() - tolerance
          : false;

        if (isOnline) {
          onlineCount++;

          if (sensor.alertsEnabled && lastReading) {
            const val = Number(lastReading.value);

            const check = (max: any, min: any, label: string) => {
              if (max && val > Number(max)) {
                alerts.push(
                  `${label} alta no sensor ${sensor.sensorName}: ${val}`,
                );
                alertCount++;
              }
              if (min && val < Number(min)) {
                alerts.push(
                  `${label} baixa no sensor ${sensor.sensorName}: ${val}`,
                );
                alertCount++;
              }
            };

            switch (sensor.type) {
              case SensorType.TEMPERATURE:
                check(plant.tempMax, plant.tempMin, 'Temperatura');
                break;
              case SensorType.HUMIDITY:
                check(plant.umiMax, plant.umiMin, 'Umidade');
                break;
              case SensorType.PH:
                check(plant.phMax, plant.phMin, 'pH');
                break;
              case SensorType.LIGHT:
                check(plant.lightMax, plant.lightMin, 'Luz');
                break;
            }
          }
        }
      });

      let finalStatus: 'OFFLINE' | 'EM ALERTA' | 'ONLINE' = 'OFFLINE';

      if (plant.sensors.length > 0 && onlineCount > 0) {
        finalStatus = alertCount > 0 ? 'EM ALERTA' : 'ONLINE';
      } else {
        finalStatus = 'OFFLINE';
      }

      const plantData: PlantStatusResponse = {
        id: plant.id,
        plantName: plant.plantName,
        species: plant.species,
        location: plant.location,
        status: finalStatus,
        alertMessages: alerts.length > 0 ? alerts : undefined,
        tempMax: plant.tempMax ? Number(plant.tempMax) : undefined,
        tempMin: plant.tempMin ? Number(plant.tempMin) : undefined,
        umiMax: plant.umiMax ? Number(plant.umiMax) : undefined,
        umiMin: plant.umiMin ? Number(plant.umiMin) : undefined,
        lightMax: plant.lightMax ? Number(plant.lightMax) : undefined,
        lightMin: plant.lightMin ? Number(plant.lightMin) : undefined,
        phMax: plant.phMax ? Number(plant.phMax) : undefined,
        phMin: plant.phMin ? Number(plant.phMin) : undefined,
        notes: plant.notes ? plant.notes : undefined,
        notesConditions: plant.notesConditions
          ? plant.notesConditions
          : undefined,
      };

      return this.removeNulls<PlantStatusResponse>(plantData);
    });

    return { data: result };
  }
}
