export interface SensorStatusResponse {
  id: number;
  sensorName: string;
  hardwareId: string;
  type: string;
  location: string;
  status: 'OFFLINE' | 'EM ALERTA' | 'ONLINE';
  alertMessages?: string[];
  lastReading?: number;
  notes?: string;
  plantName?: string;
}
