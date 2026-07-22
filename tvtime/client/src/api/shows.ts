import { apiClient } from './client';
import type { Show } from '../types';

export const showApi = {
  list: () => apiClient.get<Show[]>('/shows'),
  get: (id: number) => apiClient.get<Show>(`/shows/${id}`),
  create: (input: { title: string; totalEpisodes?: number; note?: string }) =>
    apiClient.post<Show>('/shows', input),
  update: (id: number, input: { title?: string; note?: string; totalEpisodes?: number }) =>
    apiClient.patch<Show>(`/shows/${id}`, input),
  remove: (id: number) => apiClient.delete<{ deleted: boolean }>(`/shows/${id}`),
  episodes: (id: number) => apiClient.get<import('../types').Episode[]>(`/shows/${id}/episodes`),
};
