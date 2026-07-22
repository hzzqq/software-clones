import { apiClient } from './client';
import type { Design } from '../types';

export const designApi = {
  list: () => apiClient.get<Design[]>('/designs'),
  get: (id: number) => apiClient.get<Design>(`/designs/${id}`),
  create: (input: { name?: string; thumbnail?: string; data: string }) =>
    apiClient.post<Design>('/designs', input),
  update: (id: number, input: { name?: string; thumbnail?: string; data?: string }) =>
    apiClient.patch<Design>(`/designs/${id}`, input),
  remove: (id: number) => apiClient.delete<{ deleted: boolean }>(`/designs/${id}`),
};
