import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PlantsService } from './plants.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { PlantStatusResponse } from './entities/statusPlants.insterface';

@Controller('plants')
@UseGuards(AuthGuard('jwt'))
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  @Post('create')
  create(
    @Body() createPlantDto: CreatePlantDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.plantsService.create(createPlantDto, user.userId);
  }

  @Get()
  async findAll(
    @CurrentUser() user: { userId: number },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('name') name?: string,
    @Query('species') species?: string,
    @Query('status') status?: 'ONLINE' | 'OFFLINE' | 'EM ALERTA',
    @Query('location') location?: string,
    @Query('orderBy') orderBy?: 'asc' | 'desc',
  ) {
    return this.plantsService.findAll({
      userId: user.userId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      name,
      status,
      location,
      species,
      orderBy,
    });
  }

  @Get('status')
  async getSensorsStatus(@CurrentUser() user: { userId: number }) {
    return await this.plantsService.getStatusPlants(user.userId);
  }

  @Get('options')
  async getPlantOptions(@CurrentUser() user: { userId: number }) {
    return this.plantsService.getOptions(user.userId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { userId: number },
  ): Promise<PlantStatusResponse> {
    return this.plantsService.findOne(+id, user.userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePlantDto: UpdatePlantDto,
    @CurrentUser() user: { userId: number },
  ): Promise<PlantStatusResponse> {
    return this.plantsService.update(+id, updatePlantDto, user.userId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { userId: number },
  ) {
    await this.plantsService.remove(+id, user.userId);
    return { message: `A planta de ID ${id} foi excluída com sucesso` };
  }
}
