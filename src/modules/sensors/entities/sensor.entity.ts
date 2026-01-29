export class SensorEntity {
  hardwareId!: string;
  sensorName!: string;
  type!: string;
  location!: string;
  alertsEnabled!: boolean;
  plantId?: number;
  readingIntervalSeconds?: number;
  notes?: string;

  constructor(partial: Partial<SensorEntity>) {
    Object.assign(this, partial);
  }
}
