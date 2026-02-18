import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AlertsService } from './alerts.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { ResolveAlertDto } from './dto/resolve-alert.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post('rules')
  create(
    @Body() dto: CreateAlertRuleDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.alertsService.create(dto, user.userId);
  }

  @Get('rules')
  findAll(@CurrentUser() user: { userId: number }) {
    return this.alertsService.findAll(user.userId);
  }

  @Get('rules/:id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { userId: number },
  ) {
    return this.alertsService.findOne(+id, user.userId);
  }

  @Patch('rules/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAlertRuleDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.alertsService.update(+id, dto, user.userId);
  }

  @Delete('rules/:id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { userId: number },
  ) {
    return this.alertsService.remove(+id, user.userId);
  }

  @Get()
  listAlerts(@CurrentUser() user: { userId: number }) {
    return this.alertsService.listAlerts(user.userId);
  }

  @Get(':id')
  getAlert(
    @Param('id') id: string,
    @CurrentUser() user: { userId: number },
  ) {
    return this.alertsService.getAlert(+id, user.userId);
  }

  @Post(':id/resolve')
  resolveAlert(
    @Param('id') id: string,
    @Body() dto: ResolveAlertDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.alertsService.resolveAlert(+id, dto, user.userId);
  }
}
