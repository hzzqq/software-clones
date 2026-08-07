import { apiClient } from './client';
import type { Environment } from '../types';

/** 环境（变量组）接口封装。所有路径均相对 `/api`。 */
export const environmentApi = {
  list: () => apiClient.get<Environment[]>('/environments'),
  active: () => apiClient.get<Environment | null>('/environments/active'),
  create: (input: { name: string; variables?: Record<string, string>; active?: boolean }) =>
    apiClient.post<Environment>('/environments', input),
  update: (id: number, input: { name?: string; variables?: Record<string, string> }) =>
    apiClient.patch<Environment>(`/environments/${id}`, input),
  activate: (id: number) => apiClient.post<Environment>(`/environments/${id}/activate`),
  deactivate: () => apiClient.post<{ active: null }>('/environments/deactivate'),
  remove: (id: number) => apiClient.delete<{ deleted: boolean }>(`/environments/${id}`),
};

export default environmentApi;
