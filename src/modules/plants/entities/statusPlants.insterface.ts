import { Decimal } from '@prisma/client/runtime/library';

export interface PlantStatusResponse {
  id: number;
  plantName: string;
  species: string;
  location: string;
  notes?: string;
  tempMax?: number;
  tempMin?: number;
  umiMax?: number;
  umiMin?: number;
  lightMax?: number;
  lightMin?: number;
  phMax?: number;
  phMin?: number;
  notesConditions?: string;
  status: 'OFFLINE' | 'EM ALERTA' | 'ONLINE';
  alertMessages?: string[];
  sensorsCount?: number;
  umiCurrent?: Decimal;
  phCurrent?: Decimal;
  tempCurrent?: Decimal;
  lightCurrrent?: Decimal;
}
