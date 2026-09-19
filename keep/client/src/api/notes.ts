import { apiClient } from './client';
import type { Note, NoteFormValues, NoteLabel, NoteView } from '../types';

export interface NoteListParams {
  view?: NoteView;
  label?: string;
  color?: string;
  q?: string;
}

function toPayload(values: NoteFormValues): Record<string, unknown> {
  const labels = values.labels
    .split(/[,，\s]+/)
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);
  const items = values.items
    .map((it, idx) => ({ text: it.text, done: it.done, sortOrder: idx }))
    .filter((it) => it.text.trim().length > 0);
  return {
    title: values.title,
    body: values.body,
    color: values.color,
    isPinned: values.isPinned,
    labels,
    items,
  };
}

export const notesApi = {
  list: (params: NoteListParams = {}): Promise<Note[]> => {
    const query = new URLSearchParams();
    if (params.view) query.set('view', params.view);
    if (params.label) query.set('label', params.label);
    if (params.color) query.set('color', params.color);
    if (params.q) query.set('q', params.q);
    const qs = query.toString();
    return apiClient.get<Note[]>(`/notes${qs ? `?${qs}` : ''}`);
  },
  get: (id: number): Promise<Note> => apiClient.get<Note>(`/notes/${id}`),
  create: (values: NoteFormValues): Promise<Note> =>
    apiClient.post<Note>('/notes', toPayload(values)),
  update: (id: number, values: NoteFormValues): Promise<Note> =>
    apiClient.patch<Note>(`/notes/${id}`, toPayload(values)),
  remove: (id: number): Promise<{ id: number }> => apiClient.delete<{ id: number }>(`/notes/${id}`),
  labels: (): Promise<NoteLabel[]> => apiClient.get<NoteLabel[]>('/labels'),
};
