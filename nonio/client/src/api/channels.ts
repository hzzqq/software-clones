import { apiClient } from './client';
import type { Channel } from '../types';

export const channelApi = {
  list: () => apiClient.get<Channel[]>('/channels'),
  get: (id: number) => apiClient.get<Channel>(`/channels/${id}`),
  create: (input: { name: string; description?: string }) =>
    apiClient.post<Channel>('/channels', input),
  update: (id: number, input: { name?: string; description?: string }) =>
    apiClient.patch<Channel>(`/channels/${id}`, input),
  remove: (id: number) => apiClient.delete<{ deleted: boolean }>(`/channels/${id}`),
};
