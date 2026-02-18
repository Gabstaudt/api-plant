import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { AlertRuleResponse } from './entities/alertRule.interface';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

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

  async create(dto: CreateAlertRuleDto, userId: number): Promise<AlertRuleResponse> {
    const sensorIds = dto.sensorIds ?? [];
    if (sensorIds.length) {
      const sensors = await this.prisma.sensor.findMany({
        where: { id: { in: sensorIds }, userId },
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
    const rules = await this.prisma.alertRule.findMany({
      where: { userId },
      include: { sensors: true },
      orderBy: { createdAt: 'desc' },
    });
    return { data: rules.map((r) => this.mapRule(r)) };
  }

  async findOne(id: number, userId: number): Promise<AlertRuleResponse> {
    const rule = await this.prisma.alertRule.findFirst({
      where: { id, userId },
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
    const existing = await this.prisma.alertRule.findFirst({
      where: { id, userId },
      include: { sensors: true },
    });
    if (!existing) throw new NotFoundException('Regra não encontrada.');

    const sensorIds = dto.sensorIds;
    if (sensorIds && sensorIds.length) {
      const sensors = await this.prisma.sensor.findMany({
        where: { id: { in: sensorIds }, userId },
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
    const existing = await this.prisma.alertRule.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('Regra não encontrada.');
    await this.prisma.alertRule.delete({ where: { id } });
    return { message: `Regra ${id} removida com sucesso` };
  }
}
