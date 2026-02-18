import { AlertSeverity, AlertStatus } from '@prisma/client';

export interface AlertResponse {
  id: number;
  title: string;
  description: string;
  status: AlertStatus;
  severity: AlertSeverity;
  value?: number;
  unit?: string;
  firedAt: Date;
  resolvedAt?: Date;
  resolvedComment?: string;
  resolvedBy?: { id: number; name: string } | null;
  plant?: { id: number; name: string; location: string } | null;
  sensor: { id: number; name: string; code: string; type: string };
  rule?: { id: number; name: string; detail?: string } | null;
  events?: Array<{
    id: number;
    title: string;
    message?: string;
    at: Date;
    by?: string;
  }>;
}
