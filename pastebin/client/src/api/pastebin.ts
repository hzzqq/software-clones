import { apiClient } from './client';

export interface Paste {
  id: number;
  code: string;
  title: string;
  content: string;
  language: string;
  visibility: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface PasteInput {
  title?: string;
  content: string;
  language?: string;
  visibility?: string;
  expiresInMinutes?: number;
}

export const pastebinApi = {
  create: (body: PasteInput) => apiClient.post<Paste & { url: string }>('/pastes', body),
  get: (code: string) => apiClient.get<Paste>(`/pastes/${code}`),
  list: () => apiClient.get<Paste[]>('/pastes'),
  remove: (code: string) => apiClient.delete(`/pastes/${code}`),
};
