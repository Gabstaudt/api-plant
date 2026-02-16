export class PlantEntity {
  plantName!: string;
  species!: string;
  location!: string;
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
  notes?: string;
  notesConditions?: string;
  idealRanges?: Array<{
    type: string;
    unit: string;
    min?: number;
    max?: number;
  }>;

  constructor(partial: Partial<PlantEntity>) {
    Object.assign(this, partial);
  }
}
