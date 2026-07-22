import { apiClient } from './client';

export const settingsApi = {
  getAll: (): Promise<Record<string, string>> =>
    apiClient.get<Record<string, string>>('/settings'),
  set: (key: string, value: string): Promise<null> =>
    apiClient.put<null>(`/settings/${encodeURIComponent(key)}`, { value }),
};
