import { AlertCondition, AlertSeverity } from '@prisma/client';

export interface AlertRuleResponse {
  id: number;
  name: string;
  measurementType: string;
  unit?: string;
  condition: AlertCondition;
  threshold?: number;
  severity: AlertSeverity;
  enabled: boolean;
  sensorIds?: number[];
  createdAt?: Date;
  updatedAt?: Date;
}
