export class SensorReadingEntity {
  sensorId!: number;
  value!: number;

  constructor(partial: Partial<SensorReadingEntity>) {
    Object.assign(this, partial);
  }
}
