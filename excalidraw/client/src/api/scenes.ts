import { apiClient } from './client';
import type { Scene } from '../types';

export const sceneApi = {
  list: () => apiClient.get<Scene[]>('/scenes'),
  get: (id: number) => apiClient.get<Scene>(`/scenes/${id}`),
  create: (input: { name?: string; data: string }) => apiClient.post<Scene>('/scenes', input),
  update: (id: number, input: { name?: string; data?: string }) =>
    apiClient.patch<Scene>(`/scenes/${id}`, input),
  remove: (id: number) => apiClient.delete<{ deleted: boolean }>(`/scenes/${id}`),
};
