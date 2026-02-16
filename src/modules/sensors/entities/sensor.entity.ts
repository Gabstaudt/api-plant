export class SensorEntity {
  hardwareId!: string;
  sensorName!: string;
  type!: string;
  unit!: string;
  location!: string;

  alertMax?: number;
  alertMin?: number;
  alertsEnabled!: boolean;
  plantId?: number;
  readingIntervalSeconds?: number;
  notes?: string;

  constructor(partial: Partial<SensorEntity>) {
    Object.assign(this, partial);
  }
}
