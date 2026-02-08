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
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('name') name?: string,
    @Query('status') status?: 'ONLINE' | 'OFFLINE' | 'EM ALERTA',
    @Query('location') location?: string,
  ) {
    return this.plantsService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      name,
      status,
      location,
    });
  }

  @Get('status')
  async getSensorsStatus() {
    return await this.plantsService.getStatusPlants();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PlantStatusResponse> {
    return this.plantsService.findOne(+id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePlantDto: UpdatePlantDto,
  ): Promise<PlantStatusResponse> {
    return this.plantsService.update(+id, updatePlantDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.plantsService.remove(+id);
    return { message: `A planta de ID ${id} foi excluída com sucesso` };
  }
}
