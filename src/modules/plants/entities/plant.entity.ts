export class PlantEntity {
  plantName!: string;
  species!: string;
  location!: string;
  tempMax?: number;
  tempMin?: number;
  umiMax?: number;
  umiMin?: number;
  lightMax?: number;
  lightMin?: number;
  phMax?: number;
  phMin?: number;
  notes?: string;
  notesConditions?: string;

  constructor(partial: Partial<PlantEntity>) {
    Object.assign(this, partial);
  }
}
