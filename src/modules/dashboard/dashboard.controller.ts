import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: { userId: number }) {
    return this.service.summary(user.userId);
  }

  @Get('recent-plants')
  recentPlants(
    @CurrentUser() user: { userId: number },
    @Query('limit') limit?: string,
  ) {
    return this.service.recentPlants(user.userId, limit ? Number(limit) : 4);
  }

  @Get('latest-readings')
  latestReadings(
    @CurrentUser() user: { userId: number },
    @Query('limit') limit?: string,
  ) {
    return this.service.latestReadings(user.userId, limit ? Number(limit) : 4);
  }
}
