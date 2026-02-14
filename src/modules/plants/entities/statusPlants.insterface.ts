import { Decimal } from '@prisma/client/runtime/library';

export interface PlantStatusResponse {
  id: number;
  plantName: string;
  species: string;
  location: string;
  notes?: string;
  tempUnit?: string;
  tempMax?: number;
  tempMin?: number;
  umiUnit?: string;
  umiMax?: number;
  umiMin?: number;
  lightUnit?: string;
  lightMax?: number;
  lightMin?: number;
  phUnit?: string;
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
  idealRanges?: Array<{
    type: string;
    unit: string;
    min?: number;
    max?: number;
  }>;
}
