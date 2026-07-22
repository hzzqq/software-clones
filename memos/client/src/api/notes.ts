import { apiClient } from './client';
import { Note, Visibility } from '../types';

export interface NoteQuery {
  visibility?: Visibility;
  tag?: string;
  archived?: boolean;
  pinned?: boolean;
  q?: string;
}

export const noteApi = {
  list: (query: NoteQuery = {}) => {
    const params = new URLSearchParams();
    if (query.visibility) params.set('visibility', query.visibility);
    if (query.tag) params.set('tag', query.tag);
    if (query.archived !== undefined) params.set('archived', String(query.archived));
    if (query.pinned !== undefined) params.set('pinned', String(query.pinned));
    if (query.q) params.set('q', query.q);
    const qs = params.toString();
    return apiClient.get<Note[]>(`/notes${qs ? `?${qs}` : ''}`);
  },
  get: (id: number) => apiClient.get<Note>(`/notes/${id}`),
  create: (input: { content: string; visibility?: Visibility }) =>
    apiClient.post<Note>('/notes', input),
  update: (id: number, input: { content?: string; visibility?: Visibility }) =>
    apiClient.patch<Note>(`/notes/${id}`, input),
  remove: (id: number) => apiClient.delete<{ id: number }>(`/notes/${id}`),
  archive: (id: number) => apiClient.post<Note>(`/notes/${id}/archive`),
  unarchive: (id: number) => apiClient.delete<Note>(`/notes/${id}/archive`),
  pin: (id: number) => apiClient.post<Note>(`/notes/${id}/pin`),
  unpin: (id: number) => apiClient.delete<Note>(`/notes/${id}/pin`),
};
