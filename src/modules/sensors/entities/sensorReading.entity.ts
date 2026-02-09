export class SensorReadingEntity {
  hardwareId!: string;
  value!: number;

  constructor(partial: Partial<SensorReadingEntity>) {
    Object.assign(this, partial);
  }
}
