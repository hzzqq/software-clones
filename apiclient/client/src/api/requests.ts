import { apiClient } from './client';
import type { SavedRequest, HttpMethod } from '../types';

export const requestApi = {
  list: (folder?: string) => {
    const q = folder ? `?folder=${encodeURIComponent(folder)}` : '';
    return apiClient.get<SavedRequest[]>(`/requests${q}`);
  },
  get: (id: number) => apiClient.get<SavedRequest>(`/requests/${id}`),
  create: (input: {
    name?: string;
    method: HttpMethod;
    url: string;
    headers?: Record<string, string>;
    params?: Record<string, string>;
    body?: string;
    folder?: string;
  }) => apiClient.post<SavedRequest>('/requests', input),
  update: (id: number, input: Partial<SavedRequest>) =>
    apiClient.patch<SavedRequest>(`/requests/${id}`, input),
  remove: (id: number) => apiClient.delete<{ deleted: boolean }>(`/requests/${id}`),
};
