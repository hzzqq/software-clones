import { apiClient } from './client';
import type { Service, ServiceStatus, CheckPoint } from '../types';

export const servicesApi = {
  list: () => apiClient.get<Service[]>('/services'),
  get: (id: number) => apiClient.get<Service>(`/services/${id}`),
  create: (input: { name: string; url: string; description?: string }) =>
    apiClient.post<Service>('/services', input),
  update: (id: number, input: Partial<{ name: string; url: string; description: string }>) =>
    apiClient.patch<Service>(`/services/${id}`, input),
  remove: (id: number) => apiClient.delete<null>(`/services/${id}`),
  probe: (id: number) =>
    apiClient.post<{ statusCode: number | null; ok: boolean; latencyMs: number | null; status: ServiceStatus }>(
      `/services/${id}/probe`,
    ),
  checks: (id: number, days = 90) =>
    apiClient.get<CheckPoint[]>(`/services/${id}/checks?days=${days}`),
};
