import { apiClient } from './client';
import type { HistoryItem } from '../types';

export const historyApi = {
  list: () => apiClient.get<HistoryItem[]>('/history'),
  clear: () => apiClient.delete<{ cleared: boolean }>('/history'),
};
