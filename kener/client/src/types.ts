export type ServiceStatus = 'up' | 'degraded' | 'down';

export interface Service {
  id: number;
  name: string;
  url: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  lastStatus?: ServiceStatus;
  lastCheckedAt?: string | null;
  latencyMs?: number | null;
}

export interface Incident {
  id: number;
  serviceId: number | null;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface CheckPoint {
  ok: number;
  checkedAt: string;
}
