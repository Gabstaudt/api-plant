import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SensorEntity } from './entities/sensor.entity';

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
}
