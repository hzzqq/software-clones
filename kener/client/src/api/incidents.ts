import { apiClient } from './client';
import type { Incident } from '../types';

export const incidentsApi = {
  list: () => apiClient.get<Incident[]>('/incidents'),
  create: (input: { serviceId?: number | null; title: string; description?: string; status?: string }) =>
    apiClient.post<Incident>('/incidents', input),
  update: (id: number, input: Partial<{ title: string; description: string; status: string }>) =>
    apiClient.patch<Incident>(`/incidents/${id}`, input),
  remove: (id: number) => apiClient.delete<null>(`/incidents/${id}`),
};
