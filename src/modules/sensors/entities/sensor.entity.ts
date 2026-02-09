import { SensorType } from '@prisma/client';

export class SensorEntity {
  hardwareId!: string;
  sensorName!: string;
  type!: SensorType;
  location!: string;
  alertsEnabled!: boolean;
  plantId?: number;
  readingIntervalSeconds?: number;
  notes?: string;

  constructor(partial: Partial<SensorEntity>) {
    Object.assign(this, partial);
  }
}
