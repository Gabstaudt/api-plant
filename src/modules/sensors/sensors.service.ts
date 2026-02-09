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
import { Prisma, SensorType } from '@prisma/client';
import { equal } from 'assert';

type SensorWithPlant = Prisma.SensorGetPayload<{
  include: {
    plant: true;
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

      switch (sensor.type) {
        case SensorType.TEMPERATURE:
          check(p.tempMax, p.tempMin, 'Temperatura');
          break;
        case SensorType.HUMIDITY:
          check(p.umiMax, p.umiMin, 'Umidade');
          break;
        case SensorType.PH:
          check(p.phMax, p.phMin, 'PH');
          break;
        case SensorType.LIGHT:
          check(p.lightMax, p.lightMin, 'Luminosidade');
          break;
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
      const existsPlant = await this.prisma.plant.findUnique({
        where: { id: sensor.plantId },
      });

      if (!existsPlant) throw new NotFoundException('planta inexistente');
    }
    const existsHardId = await this.prisma.sensor.findUnique({
      where: { hardwareId: sensor.hardwareId },
    });
    if (existsHardId) throw new ConflictException('O Hardware de Id já existe');

    return this.prisma.sensor.create({
      data: {
        hardwareId: sensor.hardwareId,
        sensorName: sensor.sensorName,
        type: sensor.type,
        location: sensor.location,
        alertsEnabled: sensor.alertsEnabled,
        readingIntervalSeconds: sensor.readingIntervalSeconds ?? 60,
        notes: sensor.notes,
        userId: userId,
        plantId: sensor.plantId ?? null,
      },
    });
  }

  // retorno de todos os sensores, com filtros
  async findAll(query: {
    page?: number;
    limit?: number;
    name?: string;
    type?: SensorType;
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

    if (type && !Object.values(SensorType).includes(type)) {
      throw new BadRequestException(
        `O valor "${type}" não é um tipo de sensor válido. Opções: ${Object.values(SensorType).join(', ')}`,
      );
    }

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
        plant: true,
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
        hardwareId: sensor.hardwareId,
        plantName: sensor.plant ? sensor.plant.plantName : undefined,
        status: status,
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
        plant: true,
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
      location: sensor.location,
      status: status,
      alertMessages: alerts.length > 0 ? alerts : undefined,
      lastReading: lastReadingValue,
      notes: sensor.notes ? sensor.notes : undefined,
      plantName: sensor.plant?.plantName,
    };

    return this.removeNulls<SensorStatusResponse>(sensorData);
  }

  // edução de sensor
  async update(
    id: number,
    updateSensorDto: UpdateSensorDto,
  ): Promise<SensorStatusResponse> {
    const sensor = await this.prisma.sensor.findUnique({ where: { id } });
    if (!sensor) {
      throw new NotFoundException(`Sensor com ID ${id} não encontrado`);
    }

    await this.prisma.sensor.update({
      where: { id },
      data: updateSensorDto,
    });

    return this.findOne(id);
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

        switch (sensor.type) {
          case SensorType.TEMPERATURE:
            check(p.tempMax, p.tempMin, 'Temperatura');
            break;
          case SensorType.HUMIDITY:
            check(p.umiMax, p.umiMin, 'Umidade');
            break;
          case SensorType.PH:
            check(p.phMax, p.phMin, 'PH');
            break;
          case SensorType.LIGHT:
            check(p.lightMax, p.lightMin, 'Luminosidade');
            break;
        }
      }

      const sensorData: SensorStatusResponse = {
        id: sensor.id,
        sensorName: sensor.sensorName,
        hardwareId: sensor.hardwareId,
        type: sensor.type,
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
