import { apiClient } from './client';
import { LinksResponse, ShortLink } from '../types';

export const linkApi = {
  list: () => apiClient.get<LinksResponse>('/links'),
  get: (id: number) => apiClient.get<ShortLink>(`/links/${id}`),
  create: (input: { url: string; title?: string }) =>
    apiClient.post<ShortLink>('/links', input),
  remove: (id: number) => apiClient.delete<{ id: number }>(`/links/${id}`),
};
