import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SensorEntity } from './entities/sensor.entity';
import { SensorStatusResponse } from './entities/statusSensor.interface';
import { Prisma } from '@prisma/client';

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
export class SensorsService {
  constructor(private prisma: PrismaService) {}

  //função para remover nulos
  private removeNulls<T>(obj: any): T {
    Object.keys(obj).forEach((key) => {
      if (obj[key] === null || obj[key] === undefined) {
        delete obj[key];
      }
    });
    return obj as T;
  }

  //função de retorno de status e alertas
  private calculateStatus(sensor: SensorWithPlant) {
    const now = new Date();
    const lastReading = sensor.readings[0];
    const alerts: string[] = [];

    // Cálculo de Status Online
    const intervalMs = ((sensor.readingIntervalSeconds ?? 60) + 60) * 1000;
    const isOnline = lastReading
      ? new Date(lastReading.createdAt).getTime() > now.getTime() - intervalMs
      : false;

    // Verificação de Alertas
    if (isOnline && sensor.plant && sensor.alertsEnabled && lastReading) {
      const val = Number(lastReading.value);
      const p = sensor.plant;

      // Checagem dos parâmetros
      const check = (max: any, min: any, label: string) => {
        if (max && val > Number(max)) alerts.push(`${label} alto: ${val}`);
        if (min && val < Number(min)) alerts.push(`${label} baixo: ${val}`);
      };

      switch (sensor.type.toUpperCase()) {
        case 'TEMPERATURE':
          check(p.tempMax, p.tempMin, 'Temperatura');
          break;
        case 'HUMIDITY':
          check(p.umiMax, p.umiMin, 'Umidade');
          break;
        case 'PH':
          check(p.phMax, p.phMin, 'PH');
          break;
        case 'LIGHT':
          check(p.lightMax, p.lightMin, 'Luminosidade');
          break;
        default: {
          const idealRange = sensor.plant.idealRanges?.find(
            (r) => r.type.toUpperCase() === sensor.type.toUpperCase(),
          );
          if (idealRange) {
            check(
              Number(idealRange.max),
              Number(idealRange.min),
              idealRange.type,
            );
          }
        }
      }
    }

    const status: 'OFFLINE' | 'EM ALERTA' | 'ONLINE' = !isOnline
      ? 'OFFLINE'
      : alerts.length > 0
        ? 'EM ALERTA'
        : 'ONLINE';

    return { status, alerts };
  }

  // criação de um sensor, conectando a um usuário
  async create(createSensorDto: CreateSensorDto, userId: number) {
    const sensor = new SensorEntity(createSensorDto);
    if (sensor.plantId) {
      const plant = await this.prisma.plant.findUnique({
        where: { id: sensor.plantId },
        include: { idealRanges: true },
      });

      if (!plant) throw new NotFoundException('planta inexistente');

      const idealRange = plant.idealRanges?.find(
        (r) => r.type.toUpperCase() === sensor.type.toUpperCase(),
      );

      const unitConflict =
        (sensor.type === 'TEMPERATURE' && sensor.unit !== plant.tempUnit) ||
        (sensor.type === 'HUMIDITY' && sensor.unit !== plant.umiUnit) ||
        (sensor.type === 'PH' && sensor.unit !== plant.phUnit) ||
        (sensor.type === 'LIGHT' && sensor.unit !== plant.lightUnit) ||
        (idealRange && idealRange.unit !== sensor.unit);

      if (unitConflict) {
        throw new BadRequestException(
          `Conflito de unidades: A unidade do sensor (${sensor.unit}) não coincide com a configuração da planta.`,
        );
      }
    }
    const existsHardId = await this.prisma.sensor.findUnique({
      where: { hardwareId: sensor.hardwareId },
    });

    if (existsHardId) throw new ConflictException('O Hardware de Id já existe');

    const { plantId, ...sensorData } = sensor; // Removemos o plantId do spread

    const created = await this.prisma.sensor.create({
      data: {
        ...sensorData,
        user: { connect: { id: userId } },
        // Só tenta conectar se o plantId realmente existir
        ...(plantId && { plant: { connect: { id: plantId } } }),
      },
    });
    return this.findOne(created.id);
  }

  // retorno de todos os sensores, com filtros
  async findAll(query: {
    page?: number;
    limit?: number;
    name?: string;
    type?: string;
    location?: string;
    status?: 'ONLINE' | 'OFFLINE' | 'EM ALERTA';
    plantName?: string;
    orderBy?: 'asc' | 'desc';
  }) {
    const {
      page = 1,
      limit = 10,
      name,
      type,
      location,
      status,
      plantName,
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
    const sensors = await this.prisma.sensor.findMany({
      where: {
        sensorName: name ? { contains: name, mode: 'insensitive' } : undefined,
        type: type ? type : undefined,
        location: location
          ? { contains: location, mode: 'insensitive' }
          : undefined,

        plant: plantName
          ? { plantName: { contains: plantName, mode: 'insensitive' } }
          : undefined,
      },
      include: {
        plant: {
          include: {
            idealRanges: true,
          },
        },
        readings: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { sensorName: orderBy },
    });

    const sensorWithStatus: SensorStatusResponse[] = sensors.map((sensor) => {
      const { status, alerts } = this.calculateStatus(sensor);
      const sensorData: SensorStatusResponse = {
        id: sensor.id,
        type: sensor.type,
        sensorName: sensor.sensorName,
        location: sensor.location,
        unit: sensor.unit,
        hardwareId: sensor.hardwareId,
        plantName: sensor.plant ? sensor.plant.plantName : undefined,
        status: status,
        statusReading:
          sensor.readings.length > 0
            ? sensor.readings[0].statusReading
            : undefined,
        lastReading:
          sensor.readings.length > 0
            ? Number(sensor.readings[0].value)
            : undefined,
        lastReadingAt:
          sensor.readings.length > 0 ? sensor.readings[0].createdAt : undefined,
        updateAt: sensor.updatedAt,
        plantId: sensor.plantId ? sensor.plantId : undefined,
        alertsEnabled: sensor.alertsEnabled,
        readingIntervalSeconds: sensor.readingIntervalSeconds ?? undefined,
        createdAt: sensor.createdAt,
        updatedAt: sensor.updatedAt,
      };

      return this.removeNulls<SensorStatusResponse>(sensorData);
    });

    const filteredSensors = status
      ? sensorWithStatus.filter((p) => p.status === status)
      : sensorWithStatus;

    const total = filteredSensors.length;
    const startIndex = (page - 1) * limit;
    const paginatedData = filteredSensors.slice(startIndex, startIndex + limit);

    return {
      data: paginatedData,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  // retorno de 1 sensor
  async findOne(id: number): Promise<SensorStatusResponse> {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id },
      include: {
        plant: {
          include: {
            idealRanges: true,
          },
        },
        readings: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor com ID ${id} não encontrado`);
    }
    const { status, alerts } = this.calculateStatus(sensor);
    const lastReadingValue = Number(sensor.readings[0]?.value);

    const sensorData: SensorStatusResponse = {
      id: sensor.id,
      sensorName: sensor.sensorName,
      hardwareId: sensor.hardwareId,
      type: sensor.type,
      unit: sensor.unit,
      location: sensor.location,
      status: status,
      alertMessages: alerts.length > 0 ? alerts : undefined,
      lastReading: lastReadingValue,
      lastReadingAt: sensor.readings[0]?.createdAt,
      statusReading: sensor.readings[0]?.statusReading,
      notes: sensor.notes ? sensor.notes : undefined,
      plantName: sensor.plant?.plantName,
      plantId: sensor.plantId ? sensor.plantId : undefined,
      alertsEnabled: sensor.alertsEnabled,
      readingIntervalSeconds: sensor.readingIntervalSeconds ?? undefined,
      updateAt: sensor.updatedAt,
      createdAt: sensor.createdAt,
      updatedAt: sensor.updatedAt,
    };

    return this.removeNulls<SensorStatusResponse>(sensorData);
  }

  // edução de sensor
  async update(
    id: number,
    updateSensorDto: UpdateSensorDto,
  ): Promise<SensorStatusResponse> {
    const sensor = await this.prisma.sensor.findFirst({ where: { id } });
    if (!sensor) {
      throw new NotFoundException(`Sensor com ID ${id} não encontrado`);
    }

    if (updateSensorDto.plantId) {
      const plant = await this.prisma.plant.findUnique({
        where: { id: updateSensorDto.plantId },
      });
      if (!plant) throw new NotFoundException('A planta informada não existe.');
    }

    try {
      await this.prisma.sensor.update({
        where: { id },
        data: updateSensorDto,
      });
      return this.findOne(id);
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ConflictException(
            'Este Hardware ID já está em uso por outro sensor.',
          );
        }
      }
      throw e;
    }
  }

  // exclusão de sensor
  async remove(id: number): Promise<void> {
    const sensor = await this.prisma.sensor.findUnique({ where: { id } });
    if (!sensor) {
      throw new NotFoundException(`Sensor com ID ${id} não encontrado`);
    }

    await this.prisma.sensor.delete({
      where: { id },
    });
  }

  // retorno de status de sensor
  async getStatusSensors(): Promise<{ data: SensorStatusResponse[] }> {
    // primeira verificação
    const existsSensors = await this.prisma.sensor.findFirst();
    if (!existsSensors)
      throw new NotFoundException(
        'Não existe sensores cadastrados no banco de dados',
      );

    //Início real da função
    const now = new Date();

    const sensors = await this.prisma.sensor.findMany({
      include: {
        plant: true,
        readings: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const result = sensors.map((sensor): SensorStatusResponse => {
      const lastReading = sensor.readings[0];
      const alerts: string[] = [];

      // Cálculo de Status Online
      const intervalMs = ((sensor.readingIntervalSeconds ?? 60) + 60) * 1000;
      const isOnline = lastReading
        ? new Date(lastReading.createdAt).getTime() > now.getTime() - intervalMs
        : false;

      // Verificação de Alertas
      if (isOnline && sensor.plant && sensor.alertsEnabled && lastReading) {
        const val = Number(lastReading.value);
        const p = sensor.plant;

        // Checagem dos parâmetros
        const check = (max: any, min: any, label: string) => {
          if (max && val > Number(max)) alerts.push(`${label} alto: ${val}`);
          if (min && val < Number(min)) alerts.push(`${label} baixo: ${val}`);
        };

        switch (sensor.type.toUpperCase()) {
          case 'TEMPERATURE':
            check(p.tempMax, p.tempMin, 'Temperatura (°C)');
            break;
          case 'HUMIDITY':
            check(p.umiMax, p.umiMin, 'Umidade');
            break;
          case 'PH':
            check(p.phMax, p.phMin, 'PH');
            break;
          case 'LIGHT':
            check(p.lightMax, p.lightMin, 'Luminosidade');
            break;
        }
      }

      const sensorData: SensorStatusResponse = {
        id: sensor.id,
        sensorName: sensor.sensorName,
        hardwareId: sensor.hardwareId,
        type: sensor.type,
        unit: sensor.unit,
        location: sensor.location,
        alertMessages: alerts.length > 0 ? alerts : undefined,
        status: !isOnline
          ? 'OFFLINE'
          : alerts.length > 0
            ? 'EM ALERTA'
            : 'ONLINE',
      };

      return this.removeNulls<SensorStatusResponse>(sensorData);
    });

    return { data: result };
  }
}
