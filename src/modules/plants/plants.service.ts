import { Injectable } from '@nestjs/common';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlantEntity } from './entities/plant.entity';

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
}
