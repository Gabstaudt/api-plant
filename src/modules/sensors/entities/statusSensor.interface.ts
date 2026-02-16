import { StatusReading } from '@prisma/client';

export interface SensorStatusResponse {
  id: number;
  sensorName: string;
  hardwareId: string;
  type: string;
  location: string;
  unit: string;
  status: 'OFFLINE' | 'EM ALERTA' | 'ONLINE';
  statusReading?: StatusReading;
  alertMessages?: string[];
  lastReading?: number;
  notes?: string;
  plantName?: string;
  plantId?: number;
  updateAt?: Date;
}
