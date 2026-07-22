import { apiClient } from './client';
import { Station } from '../types';

export const stationApi = {
  list: (category?: string) => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    return apiClient.get<Station[]>(`/stations${qs}`);
  },
  featured: () => apiClient.get<Station | null>('/stations/featured'),
  create: (input: {
    name: string;
    streamUrl: string;
    description?: string;
    category?: string;
  }) => apiClient.post<Station>('/stations', input),
  update: (
    id: number,
    input: { name?: string; streamUrl?: string; description?: string; category?: string },
  ) => apiClient.patch<Station>(`/stations/${id}`, input),
  remove: (id: number) => apiClient.delete<{ id: number }>(`/stations/${id}`),
  like: (id: number) => apiClient.post<Station>(`/stations/${id}/like`),
};
