import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SensorEntity } from './entities/sensor.entity';
import { SensorStatusResponse } from './entities/statusSensor.interface';
import { SensorType } from '@prisma/client';

@Injectable()
export class SensorsService {
  constructor(private prisma: PrismaService) {}

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
        userId: userId, // O ID que vem do token no Controller
        plantId: sensor.plantId ?? null,
      },
    });
  }

  findAll() {
    return `This action returns all sensors`;
  }

  findOne(id: number) {
    return `This action returns a #${id} sensor`;
  }

  update(id: number, updateSensorDto: UpdateSensorDto) {
    return `This action updates a #${id} sensor`;
  }

  remove(id: number) {
    return `This action removes a #${id} sensor`;
  }

  async getStatusSensors(): Promise<{ data: SensorStatusResponse[] }> {
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

    const calcStatusSensors = sensors.map((sensor): SensorStatusResponse => {
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

      return {
        id: sensor.id,
        sensorName: sensor.sensorName,
        hardwareId: sensor.hardwareId,
        type: sensor.type,
        location: sensor.location,
        alertMessages: alerts ? alerts : undefined,
        status: !isOnline
          ? 'OFFLINE'
          : alerts.length > 0
            ? 'EM ALERTA'
            : 'ONLINE',
      };
    });

    return { data: calcStatusSensors };
  }
}
