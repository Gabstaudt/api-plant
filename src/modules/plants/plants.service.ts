import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlantEntity } from './entities/plant.entity';
import { PlantStatusResponse } from './entities/statusPlants.insterface';
import { SensorType } from '@prisma/client';

@Injectable()
export class PlantsService {
  constructor(private prisma: PrismaService) {}

  //função para remover nulos(usado em getters)
  private removeNulls<T>(obj: any): T {
    Object.keys(obj).forEach((key) => {
      if (obj[key] === null || obj[key] === undefined) {
        delete obj[key];
      }
    });
    return obj as T;
  }

  // criação de uma planta, conectando a um usuário
  async create(createPlantDto: CreatePlantDto, userId: number) {
    const plant = new PlantEntity(createPlantDto);

    const checkLimits = (max: any, min: any, label: string) => {
      if (max && min) {
        if (max < min)
          throw new BadRequestException(
            `O valor de ${label} máximo(a) não pode ser menor que de ${label} mínimo(a)`,
          );
      }
    };
    checkLimits(plant.phMax, plant.phMin, 'ph');
    checkLimits(plant.tempMax, plant.tempMin, 'temperatura');
    checkLimits(plant.umiMax, plant.umiMin, 'umidade');
    checkLimits(plant.lightMax, plant.lightMin, 'luminosidade');
    return this.prisma.plant.create({
      data: {
        ...plant,
        user: {
          connect: { id: userId },
        },
      },
    });
  }

  //retorno de todas as plantas(com filtros)
  async findAll(query: {
    page?: number;
    limit?: number;
    name?: string;
    species?: string;
    location?: string;
    status?: 'ONLINE' | 'OFFLINE' | 'EM ALERTA';
    orderBy?: 'asc' | 'desc';
  }) {
    const {
      page = 1,
      limit = 10,
      name,
      species,
      location,
      status,
      orderBy = 'asc',
    } = query;

    const now = new Date();

    const plants = await this.prisma.plant.findMany({
      where: {
        plantName: name ? { startsWith: name, mode: 'insensitive' } : undefined,
        species: species
          ? { startsWith: species, mode: 'insensitive' }
          : undefined,
        location: location
          ? { startsWith: location, mode: 'insensitive' }
          : undefined,
      },
      include: {
        sensors: {
          include: {
            readings: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },

      orderBy: { plantName: orderBy },
    });

    const plantsWithStatus: PlantStatusResponse[] = plants.map((plant) => {
      let onlineCount = 0;
      let alertCount = 0;
      const alerts: string[] = [];

      plant.sensors.forEach((sensor) => {
        const lastReading = sensor.readings[0];
        const interval = (sensor.readingIntervalSeconds ?? 60 + 60) * 1000;
        const isOnline =
          lastReading &&
          now.getTime() - new Date(lastReading.createdAt).getTime() < interval;

        if (isOnline) onlineCount++;

        if (sensor.alertsEnabled && lastReading) {
          const val = Number(lastReading.value);
          const check = (max: any, min: any, label: string) => {
            if (max && val > Number(max)) {
              alerts.push(`${label} alta`);
              alertCount++;
            }
            if (min && val < Number(min)) {
              alerts.push(`${label} baixa`);
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
      });

      const finalStatus =
        alertCount > 0 ? 'EM ALERTA' : onlineCount > 0 ? 'ONLINE' : 'OFFLINE';
      const plantData: PlantStatusResponse = {
        id: plant.id,
        plantName: plant.plantName,
        location: plant.location,
        species: plant.species,
        status: finalStatus,
        alertMessages: alerts,
      };

      return this.removeNulls<PlantStatusResponse>(plantData);
    });

    //aplicando os demais filtros
    const filteredPlants = status
      ? plantsWithStatus.filter((p) => p.status === status)
      : plantsWithStatus;
    const total = filteredPlants.length;
    const startIndex = (page - 1) * limit;
    const paginatedData = filteredPlants.slice(startIndex, startIndex + limit);

    return {
      data: paginatedData,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  //Detalhes de uma única planta
  async findOne(id: number) {
    const now = new Date();

    const plant = await this.prisma.plant.findUnique({
      where: { id },
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

    if (!plant) {
      throw new NotFoundException(`Planta com ID ${id} não encontrada`);
    }

    // Cálculo de Status
    let onlineCount = 0;
    let alertCount = 0;
    const alerts: string[] = [];

    plant.sensors.forEach((sensor) => {
      const lastReading = sensor.readings[0];
      const interval = (sensor.readingIntervalSeconds ?? 60) + 60;
      const toleranceMs = interval * 1000;

      const isOnline = lastReading
        ? now.getTime() - new Date(lastReading.createdAt).getTime() <
          toleranceMs
        : false;

      if (isOnline) onlineCount++;

      // Verificação de alertas
      if (sensor.alertsEnabled && lastReading) {
        const val = Number(lastReading.value);

        const check = (max: any, min: any, label: string) => {
          if (max && val > Number(max)) {
            alerts.push(`${label} alta no sensor ${sensor.sensorName}: ${val}`);
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
    });

    // Status Final
    const finalStatus =
      alertCount > 0 ? 'EM ALERTA' : onlineCount > 0 ? 'ONLINE' : 'OFFLINE';

    const result: PlantStatusResponse = {
      id: plant.id,
      plantName: plant.plantName,
      species: plant.species,
      location: plant.location,
      status: finalStatus,
      alertMessages: alerts,
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

    return this.removeNulls<PlantStatusResponse>(result);
  }

  async update(id: number, updatePlantDto: UpdatePlantDto) {
    const plant = await this.prisma.plant.findUnique({ where: { id } });
    if (!plant)
      throw new NotFoundException('Planta não encontrada no banco de dados');

    await this.prisma.plant.update({
      where: { id },
      data: updatePlantDto,
    });

    return this.findOne(id);
  }

  // Exclusão de planta
  async remove(id: number): Promise<void> {
    const plant = await this.prisma.plant.findUnique({ where: { id } });
    if (!plant)
      throw new NotFoundException('Planta não encontrada no banco de dados');

    await this.prisma.plant.delete({
      where: { id },
    });
  }

  //retorno de Status de planta
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
