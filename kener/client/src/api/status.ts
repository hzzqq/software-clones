import { apiClient } from './client';
import type { ServiceStatus } from '../types';

export const statusApi = {
  summary: () =>
    apiClient.get<{
      overall: ServiceStatus;
      services: { id: number; name: string; status: ServiceStatus; latencyMs: number | null }[];
    }>('/status/summary'),
};
