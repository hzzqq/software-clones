import { apiClient } from './client';
import type { Note } from '../types';

export const noteApi = {
  list: (params?: { folder?: string; tag?: string; q?: string; includeContent?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.folder) qs.set('folder', params.folder);
    if (params?.tag) qs.set('tag', params.tag);
    if (params?.q) qs.set('q', params.q);
    if (params?.includeContent) qs.set('includeContent', 'true');
    const q = qs.toString();
    return apiClient.get<Note[]>(`/notes${q ? `?${q}` : ''}`);
  },
  get: (id: number) => apiClient.get<Note>(`/notes/${id}`),
  create: (input: { title?: string; content: string; folder?: string; tags?: string[] }) =>
    apiClient.post<Note>('/notes', input),
  update: (
    id: number,
    input: { title?: string; content?: string; folder?: string; tags?: string[]; pinned?: boolean },
  ) => apiClient.patch<Note>(`/notes/${id}`, input),
  remove: (id: number) => apiClient.delete<{ deleted: boolean }>(`/notes/${id}`),
};
