import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PlantsService } from './plants.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';

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
  findAll() {
    return this.plantsService.findAll();
  }

  @Get('status')
  async getSensorsStatus() {
    return await this.plantsService.getStatusPlants();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.plantsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlantDto: UpdatePlantDto) {
    return this.plantsService.update(+id, updatePlantDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.plantsService.remove(+id);
  }
}
