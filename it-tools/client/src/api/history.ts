import { apiClient } from './client';

/** History entry shape returned by the backend. */
export interface History {
  id: number;
  toolKey: string;
  summary: string;
  createdAt: string;
}

export interface HistoryInput {
  toolKey: string;
  summary: string;
}

export const historyApi = {
  list: (limit = 50): Promise<History[]> =>
    apiClient.get<History[]>(`/history?limit=${limit}`),
  create: (input: HistoryInput): Promise<History> =>
    apiClient.post<History>('/history', input),
  remove: (id: number): Promise<null> => apiClient.delete<null>(`/history/${id}`),
};
