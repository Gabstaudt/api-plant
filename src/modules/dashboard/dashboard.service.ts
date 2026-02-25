import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private async getEcosystemId(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ecosystemId: true },
    });
    if (!user?.ecosystemId) throw new UnauthorizedException('Usuário sem ecossistema');
    return user.ecosystemId;
  }

  async summary(userId: number) {
    const ecosystemId = await this.getEcosystemId(userId);
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prev30 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prev7 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [plantsCount, sensorsTotal, alertsActive, plantsLast30, plantsPrev30, sensorsLast7, sensorsPrev7] =
      await this.prisma.$transaction([
        this.prisma.plant.count({ where: { user: { ecosystemId } } }),
        this.prisma.sensor.count({ where: { user: { ecosystemId } } }),
        this.prisma.alert.count({ where: { user: { ecosystemId }, status: 'ATIVO' } }),
        this.prisma.plant.count({ where: { user: { ecosystemId }, createdAt: { gte: last30 } } }),
        this.prisma.plant.count({ where: { user: { ecosystemId }, createdAt: { gte: prev30, lt: last30 } } }),
        this.prisma.sensor.count({ where: { user: { ecosystemId }, createdAt: { gte: last7 } } }),
        this.prisma.sensor.count({ where: { user: { ecosystemId }, createdAt: { gte: prev7, lt: last7 } } }),
      ]);

    const sensors = await this.prisma.sensor.findMany({
      where: { user: { ecosystemId } },
      include: {
        readings: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    const sensorsOnline = sensors.filter((s) => {
      const last = s.readings[0];
      if (!last) return false;
      const intervalMs = ((s.readingIntervalSeconds ?? 60) + 60) * 1000;
      return now.getTime() - new Date(last.createdAt).getTime() < intervalMs;
    }).length;

    const successRate = sensorsTotal > 0 ? (sensorsOnline / sensorsTotal) * 100 : 0;
    const plantsMonth = plantsPrev30 > 0 ? ((plantsLast30 - plantsPrev30) / plantsPrev30) * 100 : 0;
    const sensorsWeek = sensorsPrev7 > 0 ? ((sensorsLast7 - sensorsPrev7) / sensorsPrev7) * 100 : 0;

    return {
      counts: {
        plants: plantsCount,
        sensorsOnline,
        sensorsTotal,
        alerts: alertsActive,
        successRate: Number(successRate.toFixed(1)),
      },
      trend: {
        plantsMonth: Number(plantsMonth.toFixed(1)),
        sensorsWeek: Number(sensorsWeek.toFixed(1)),
        successVsMonth: 0,
      },
    };
  }

  async recentPlants(userId: number, limit = 4) {
    const ecosystemId = await this.getEcosystemId(userId);
    const plants = await this.prisma.plant.findMany({
      where: { user: { ecosystemId } },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, limit),
      include: {
        _count: { select: { sensors: true } },
        sensors: {
          include: { readings: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
      },
    });
    return {
      data: plants.map((p) => ({
        id: p.id,
        name: p.plantName,
        species: p.species,
        location: p.location,
        sensorsCount: p._count.sensors,
        createdAt: p.createdAt,
        readings: buildPlantReadings(p.sensors),
      })),
    };
  }

  async latestReadings(userId: number, limit = 4) {
    const ecosystemId = await this.getEcosystemId(userId);
    const readings = await this.prisma.sensorReadings.findMany({
      where: { sensor: { user: { ecosystemId } } },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, limit),
      include: {
        sensor: { include: { plant: true } },
      },
    });
    return {
      data: readings.map((r) => ({
        id: r.id,
        sensorName: r.sensor.sensorName,
        plantName: r.sensor.plant?.plantName ?? null,
        value: Number(r.value),
        unit: r.sensor.unit,
        type: r.sensor.type,
        createdAt: r.createdAt,
      })),
    };
  }
}

function buildPlantReadings(
  sensors: Array<{ type: string; unit: string; readings: Array<{ value: any; createdAt: Date }> }>,
) {
  let humidity: { value: number; unit?: string } | null = null;
  let temperature: { value: number; unit?: string } | null = null;
  let light: { value: number; unit?: string } | null = null;
  let latestAt: Date | null = null;

  sensors.forEach((s) => {
    const last = s.readings[0];
    if (!last) return;
    const type = s.type?.toUpperCase?.() ?? '';
    const value = Number(last.value);
    if (!Number.isFinite(value)) return;
    if (!latestAt || last.createdAt > latestAt) latestAt = last.createdAt;

    if (type.includes('HUMID')) {
      humidity = { value, unit: s.unit };
    } else if (type.includes('TEMP')) {
      temperature = { value, unit: s.unit };
    } else if (type.includes('LUMIN') || type.includes('LIGHT')) {
      light = { value, unit: s.unit };
    }
  });

  return {
    humidity,
    temperature,
    light,
    latestAt,
  };
}
