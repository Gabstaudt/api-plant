import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlantEntity } from './entities/plant.entity';
import { PlantStatusResponse } from './entities/statusPlants.insterface';
import { Prisma, SensorType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

type PlantWithSensors = Prisma.PlantGetPayload<{
  include: {
    sensors: {
      include: {
        readings: true;
      };
    };
    idealRanges: true;
  };
}>;

@Injectable()
export class PlantsService {
  constructor(private prisma: PrismaService) {}

  //método para remover nulos(usado em getters)
  private removeNulls<T>(obj: any): T {
    Object.keys(obj).forEach((key) => {
      if (obj[key] === null || obj[key] === undefined) {
        delete obj[key];
      }
    });
    return obj as T;
  }

  //método de cálculo de alertas e status
  private calculatePlantHealth(plant: PlantWithSensors) {
    const now = new Date();
    let onlineCount = 0;
    let alertCount = 0;
    const alertMessages: string[] = [];
    let sensorsCount = 0;

    type SensorReading = {
      id: number;
      createdAt: Date;
      sensorId: number;
      value: Decimal;
    };

    const lastReadingsSensors: Partial<Record<SensorType, SensorReading>> = {};

    plant.sensors.forEach((sensor) => {
      sensorsCount++;
      const lastReading = sensor.readings[0];

      // Definição da conectividade
      const interval = (sensor.readingIntervalSeconds ?? 60) + 60;
      const toleranceMs = interval * 1000;
      const isOnline =
        lastReading &&
        now.getTime() - new Date(lastReading.createdAt).getTime() < toleranceMs;

      if (isOnline) onlineCount++;

      // Lógica de alertas
      if (sensor.alertsEnabled && lastReading) {
        const val = Number(lastReading.value);

        const check = (max: any, min: any, label: string) => {
          if (max && val > Number(max)) {
            alertMessages.push(
              `${label} alta no sensor ${sensor.sensorName}: ${val}`,
            );
            alertCount++;
          }
          if (min && val < Number(min)) {
            alertMessages.push(
              `${label} baixa no sensor ${sensor.sensorName}: ${val}`,
            );
            alertCount++;
          }
        };
        switch (sensor.type) {
          case SensorType.TEMPERATURE: {
            check(plant.tempMax, plant.tempMin, 'Temperatura');
            const tempCurrent = lastReading;
            lastReadingsSensors[SensorType.TEMPERATURE] = tempCurrent;
            break;
          }
          case SensorType.HUMIDITY: {
            check(plant.umiMax, plant.umiMin, 'Umidade');
            const umiCurrent = lastReading;
            lastReadingsSensors[SensorType.HUMIDITY] = umiCurrent;
            break;
          }
          case SensorType.PH: {
            check(plant.phMax, plant.phMin, 'pH');
            const phCurrent = lastReading;
            lastReadingsSensors[SensorType.PH] = phCurrent;
            break;
          }
          case SensorType.LIGHT: {
            check(plant.lightMax, plant.lightMin, 'Luz');
            const lightCurrent = lastReading;
            lastReadingsSensors[SensorType.LIGHT] = lightCurrent;
            break;
          }
        }
      }
    });

    //Definição do Status Final
    const status: 'OFFLINE' | 'EM ALERTA' | 'ONLINE' =
      alertCount > 0 ? 'EM ALERTA' : onlineCount > 0 ? 'ONLINE' : 'OFFLINE';

    return { status, alertMessages, lastReadingsSensors, sensorsCount };
  }

  // criação de uma planta, conectando a um usuário
  async create(createPlantDto: CreatePlantDto, userId: number) {
    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const plant = new PlantEntity(createPlantDto);
    const idealRanges = createPlantDto.idealRanges ?? [];

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
    const checkRange = (max: any, min: any, label: string) => {
      if (max !== undefined && min !== undefined && max < min) {
        throw new BadRequestException(
          `O valor de ${label} máximo(a) não pode ser menor que de ${label} mínimo(a)`,
        );
      }
    };

    idealRanges.forEach((r) => {
      checkRange(r.max, r.min, r.type);
    });

    const legacyFromRanges = pickLegacyFromRanges(idealRanges);
    const { idealRanges: _ignore, ...plantData } = plant;

    const created = await this.prisma.plant.create({
      data: {
        ...plantData,
        ...legacyFromRanges,
        user: {
          connect: { id: userId },
        },
        idealRanges: idealRanges.length
          ? {
              createMany: {
                data: idealRanges.map((r) => ({
                  type: r.type,
                  unit: r.unit,
                  min: r.min ?? null,
                  max: r.max ?? null,
                })),
              },
            }
          : undefined,
      },
    });
    return this.findOne(created.id);
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

    const validStatuses = ['ONLINE', 'OFFLINE', 'EM ALERTA'];
    if (status && !validStatuses.includes(status)) {
      throw new BadRequestException(
        `Status inválido. Valores aceitos: ${validStatuses.join(', ')}`,
      );
    }

    const validorder = ['asc', 'desc'];
    if (orderBy && !validorder.includes(orderBy)) {
      throw new BadRequestException(
        `Ordem inválida. Valores aceitos: ${validorder.join(', ')}`,
      );
    }

    const plants = await this.prisma.plant.findMany({
      where: {
        plantName: name ? { contains: name, mode: 'insensitive' } : undefined,
        species: species
          ? { contains: species, mode: 'insensitive' }
          : undefined,
        location: location
          ? { contains: location, mode: 'insensitive' }
          : undefined,
      },
      include: {
        sensors: {
          include: {
            readings: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        idealRanges: true,
      },

      orderBy: { plantName: orderBy },
    });

    const plantsWithStatus: PlantStatusResponse[] = plants.map((plant) => {
      const { status, alertMessages, lastReadingsSensors, sensorsCount } =
        this.calculatePlantHealth(plant);
      const plantData: PlantStatusResponse = {
        id: plant.id,
        plantName: plant.plantName,
        location: plant.location,
        species: plant.species,
        tempUnit: plant.tempUnit ?? undefined,
        umiUnit: plant.umiUnit ?? undefined,
        lightUnit: plant.lightUnit ?? undefined,
        phUnit: plant.phUnit ?? undefined,
        idealRanges: plant.idealRanges?.map((r) => ({
              type: r.type,
          unit: r.unit,
          min: r.min ? Number(r.min) : undefined,
          max: r.max ? Number(r.max) : undefined,
        })),
        status: status,
        alertMessages: alertMessages,
        phCurrent: lastReadingsSensors.PH
          ? lastReadingsSensors.PH.value
          : undefined,
        umiCurrent: lastReadingsSensors.HUMIDITY
          ? lastReadingsSensors.HUMIDITY.value
          : undefined,
        tempCurrent: lastReadingsSensors.TEMPERATURE
          ? lastReadingsSensors.TEMPERATURE.value
          : undefined,
        lightCurrrent: lastReadingsSensors.LIGHT
          ? lastReadingsSensors.LIGHT.value
          : undefined,
        sensorsCount: sensorsCount,
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
  async findOne(id: number): Promise<PlantStatusResponse> {
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
        idealRanges: true,
      },
    });

    if (!plant) {
      throw new NotFoundException(`Planta com ID ${id} não encontrada`);
    }

    const { status, alertMessages } = this.calculatePlantHealth(plant);

    const result: PlantStatusResponse = {
      id: plant.id,
      plantName: plant.plantName,
      species: plant.species,
      location: plant.location,
      tempUnit: plant.tempUnit ?? undefined,
      umiUnit: plant.umiUnit ?? undefined,
      lightUnit: plant.lightUnit ?? undefined,
      phUnit: plant.phUnit ?? undefined,
      idealRanges: plant.idealRanges?.map((r) => ({
              type: r.type,
        unit: r.unit,
        min: r.min ? Number(r.min) : undefined,
        max: r.max ? Number(r.max) : undefined,
      })),
      status: status,
      alertMessages: alertMessages,
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

    const idealRanges = updatePlantDto.idealRanges ?? [];
    const legacyFromRanges = pickLegacyFromRanges(idealRanges);

    await this.prisma.plant.update({
      where: { id },
      data: {
        ...updatePlantDto,
        ...legacyFromRanges,
        idealRanges: idealRanges.length
          ? {
              deleteMany: {},
              createMany: {
                data: idealRanges.map((r) => ({
                  type: r.type,
                  unit: r.unit,
                  min: r.min ?? null,
                  max: r.max ?? null,
                })),
              },
            }
          : { deleteMany: {} },
      },
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
        idealRanges: true,
      },
    });

    const result = plants.map((plant) => {
      const { status, alertMessages } = this.calculatePlantHealth(plant);

      const plantData: PlantStatusResponse = {
        id: plant.id,
        plantName: plant.plantName,
        species: plant.species,
        location: plant.location,
        tempUnit: plant.tempUnit ?? undefined,
        umiUnit: plant.umiUnit ?? undefined,
        lightUnit: plant.lightUnit ?? undefined,
        phUnit: plant.phUnit ?? undefined,
        idealRanges: plant.idealRanges?.map((r) => ({
              type: r.type,
          unit: r.unit,
          min: r.min ? Number(r.min) : undefined,
          max: r.max ? Number(r.max) : undefined,
        })),
        status: status,
        alertMessages: alertMessages.length > 0 ? alertMessages : undefined,
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

  async getOptions() {
    const [species, locations, units] = await Promise.all([
      this.prisma.plant.findMany({
        distinct: ['species'],
        select: { species: true },
        orderBy: { species: 'asc' },
      }),
      this.prisma.plant.findMany({
        distinct: ['location'],
        select: { location: true },
        orderBy: { location: 'asc' },
      }),
      this.prisma.plantIdealRange.findMany({
        distinct: ['type', 'unit'],
        select: { type: true, unit: true },
        orderBy: [{ type: 'asc' }, { unit: 'asc' }],
      }),
    ]);

    const types: string[] = [];
    const unitList: string[] = [];
    units.forEach((u) => {
      if (!types.includes(u.type)) types.push(u.type);
      if (!unitList.includes(u.unit)) unitList.push(u.unit);
    });

    return {
      species: species.map((s) => s.species),
      locations: locations.map((l) => l.location),
      types,
      units: unitList,
    };
  }
}

function pickLegacyFromRanges(
  ranges: Array<{ type: string; unit: string; min?: number; max?: number }>,
) {
  const byType: Record<string, { unit: string; min?: number; max?: number }> =
    {};
  ranges.forEach((r) => {
    const key = r.type.trim().toUpperCase();
    if (!byType[key]) {
      byType[key] = { unit: r.unit, min: r.min, max: r.max };
    }
  });

  return {
    tempUnit: byType.TEMPERATURE?.unit,
    tempMin: byType.TEMPERATURE?.min,
    tempMax: byType.TEMPERATURE?.max,
    umiUnit: byType.HUMIDITY?.unit,
    umiMin: byType.HUMIDITY?.min,
    umiMax: byType.HUMIDITY?.max,
    lightUnit: byType.LIGHT?.unit,
    lightMin: byType.LIGHT?.min,
    lightMax: byType.LIGHT?.max,
    phUnit: byType.PH?.unit,
    phMin: byType.PH?.min,
    phMax: byType.PH?.max,
  };
}
