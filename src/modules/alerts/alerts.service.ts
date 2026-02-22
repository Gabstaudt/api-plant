import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { AlertRuleResponse } from './entities/alertRule.interface';
import { AlertResponse } from './entities/alert.interface';
import { ResolveAlertDto } from './dto/resolve-alert.dto';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  private async getEcosystemId(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ecosystemId: true },
    });
    if (!user?.ecosystemId) {
      throw new NotFoundException('Usuário sem ecossistema');
    }
    return user.ecosystemId;
  }

  private mapRule(rule: any): AlertRuleResponse {
    return {
      id: rule.id,
      name: rule.name,
      measurementType: rule.measurementType,
      unit: rule.unit ?? undefined,
      condition: rule.condition,
      threshold: rule.threshold ? Number(rule.threshold) : undefined,
      severity: rule.severity,
      enabled: rule.enabled,
      sensorIds: rule.sensors?.map((s: any) => s.sensorId) ?? [],
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  private mapAlert(alert: any): AlertResponse {
    return {
      id: alert.id,
      title: alert.title,
      description: alert.description,
      status: alert.status,
      severity: alert.severity,
      value: alert.value ? Number(alert.value) : undefined,
      unit: alert.unit ?? undefined,
      firedAt: alert.firedAt,
      resolvedAt: alert.resolvedAt ?? undefined,
      resolvedComment: alert.resolvedComment ?? undefined,
      resolvedBy: alert.resolvedBy
        ? { id: alert.resolvedBy.id, name: alert.resolvedBy.fullName }
        : null,
      plant: alert.plant
        ? {
            id: alert.plant.id,
            name: alert.plant.plantName,
            location: alert.plant.location,
          }
        : null,
      sensor: {
        id: alert.sensor.id,
        name: alert.sensor.sensorName,
        code: alert.sensor.hardwareId,
        type: alert.sensor.type,
      },
      rule: alert.alertRule
        ? {
            id: alert.alertRule.id,
            name: alert.alertRule.name,
            detail: alert.alertRule.condition
              ? `${alert.alertRule.condition}`
              : undefined,
          }
        : null,
      events:
        alert.events?.map((e: any) => ({
          id: e.id,
          title: e.title,
          message: e.message ?? undefined,
          at: e.createdAt,
          by: e.user?.fullName ?? undefined,
        })) ?? [],
    };
  }

  async create(dto: CreateAlertRuleDto, userId: number): Promise<AlertRuleResponse> {
    const ecosystemId = await this.getEcosystemId(userId);
    const sensorIds = dto.sensorIds ?? [];
    if (sensorIds.length) {
      const sensors = await this.prisma.sensor.findMany({
        where: { id: { in: sensorIds }, user: { ecosystemId } },
        select: { id: true },
      });
      if (sensors.length !== sensorIds.length) {
        throw new NotFoundException('Um ou mais sensores não foram encontrados.');
      }
    }

    if (
      ['GREATER_THAN', 'LESS_THAN', 'EQUALS'].includes(dto.condition) &&
      dto.threshold === undefined
    ) {
      throw new BadRequestException('Informe o valor de referência do alerta.');
    }

    const created = await this.prisma.alertRule.create({
      data: {
        name: dto.name,
        measurementType: dto.measurementType,
        unit: dto.unit ?? null,
        condition: dto.condition,
        threshold: dto.threshold ?? null,
        severity: dto.severity,
        enabled: dto.enabled ?? true,
        user: { connect: { id: userId } },
        sensors: sensorIds.length
          ? {
              create: sensorIds.map((sensorId) => ({
                sensor: { connect: { id: sensorId } },
              })),
            }
          : undefined,
      },
      include: {
        sensors: true,
      },
    });

    return this.mapRule(created);
  }

  async findAll(userId: number): Promise<{ data: AlertRuleResponse[] }> {
    const ecosystemId = await this.getEcosystemId(userId);
    const rules = await this.prisma.alertRule.findMany({
      where: { user: { ecosystemId } },
      include: { sensors: true },
      orderBy: { createdAt: 'desc' },
    });
    return { data: rules.map((r) => this.mapRule(r)) };
  }

  async findOne(id: number, userId: number): Promise<AlertRuleResponse> {
    const ecosystemId = await this.getEcosystemId(userId);
    const rule = await this.prisma.alertRule.findFirst({
      where: { id, user: { ecosystemId } },
      include: { sensors: true },
    });
    if (!rule) throw new NotFoundException('Regra não encontrada.');
    return this.mapRule(rule);
  }

  async update(
    id: number,
    dto: UpdateAlertRuleDto,
    userId: number,
  ): Promise<AlertRuleResponse> {
    const ecosystemId = await this.getEcosystemId(userId);
    const existing = await this.prisma.alertRule.findFirst({
      where: { id, user: { ecosystemId } },
      include: { sensors: true },
    });
    if (!existing) throw new NotFoundException('Regra não encontrada.');

    const sensorIds = dto.sensorIds;
    if (sensorIds && sensorIds.length) {
      const sensors = await this.prisma.sensor.findMany({
        where: { id: { in: sensorIds }, user: { ecosystemId } },
        select: { id: true },
      });
      if (sensors.length !== sensorIds.length) {
        throw new NotFoundException('Um ou mais sensores não foram encontrados.');
      }
    }

    const updated = await this.prisma.alertRule.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        measurementType: dto.measurementType ?? undefined,
        unit: dto.unit ?? undefined,
        condition: dto.condition ?? undefined,
        threshold: dto.threshold ?? undefined,
        severity: dto.severity ?? undefined,
        enabled: dto.enabled ?? undefined,
        sensors: sensorIds
          ? {
              deleteMany: {},
              create: sensorIds.map((sensorId) => ({
                sensor: { connect: { id: sensorId } },
              })),
            }
          : undefined,
      },
      include: { sensors: true },
    });

    return this.mapRule(updated);
  }

  async remove(id: number, userId: number) {
    const ecosystemId = await this.getEcosystemId(userId);
    const existing = await this.prisma.alertRule.findFirst({
      where: { id, user: { ecosystemId } },
    });
    if (!existing) throw new NotFoundException('Regra não encontrada.');
    await this.prisma.alertRule.delete({ where: { id } });
    return { message: `Regra ${id} removida com sucesso` };
  }

  async listAlerts(userId: number): Promise<{ data: AlertResponse[] }> {
    const ecosystemId = await this.getEcosystemId(userId);
    const alerts = await this.prisma.alert.findMany({
      where: { user: { ecosystemId } },
      include: {
        plant: true,
        sensor: true,
        alertRule: true,
        resolvedBy: true,
      },
      orderBy: { firedAt: 'desc' },
    });
    return { data: alerts.map((a) => this.mapAlert(a)) };
  }

  async getAlert(id: number, userId: number): Promise<AlertResponse> {
    const ecosystemId = await this.getEcosystemId(userId);
    const alert = await this.prisma.alert.findFirst({
      where: { id, user: { ecosystemId } },
      include: {
        plant: true,
        sensor: true,
        alertRule: true,
        resolvedBy: true,
        events: { include: { user: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!alert) throw new NotFoundException('Alerta não encontrado.');
    return this.mapAlert(alert);
  }

  async resolveAlert(
    id: number,
    dto: ResolveAlertDto,
    userId: number,
  ): Promise<AlertResponse> {
    const ecosystemId = await this.getEcosystemId(userId);
    const alert = await this.prisma.alert.findFirst({
      where: { id, user: { ecosystemId } },
      include: { events: true },
    });
    if (!alert) throw new NotFoundException('Alerta não encontrado.');

    const updated = await this.prisma.alert.update({
      where: { id },
      data: {
        status: 'RESOLVIDO',
        resolvedAt: new Date(),
        resolvedComment: dto.comment,
        resolvedBy: { connect: { id: userId } },
        events: {
          create: {
            title: 'Alerta resolvido',
            message: dto.comment,
            user: { connect: { id: userId } },
          },
        },
      },
      include: {
        plant: true,
        sensor: true,
        alertRule: true,
        resolvedBy: true,
        events: { include: { user: true }, orderBy: { createdAt: 'desc' } },
      },
    });

    return this.mapAlert(updated);
  }
}
