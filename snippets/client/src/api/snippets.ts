import { apiClient } from './client';
import type { Snippet, SnippetFormValues, Tag, LanguageOption } from '../types';

export interface SnippetListParams {
  language?: string;
  tag?: string;
  q?: string;
}

function toPayload(values: SnippetFormValues): { title: string; language: string; code: string; tags: string } {
  return {
    title: values.title.trim(),
    language: values.language,
    code: values.code,
    tags: values.tags,
  };
}

export const snippetsApi = {
  list: (params: SnippetListParams = {}): Promise<Snippet[]> => {
    const query = new URLSearchParams();
    if (params.language) query.set('language', params.language);
    if (params.tag) query.set('tag', params.tag);
    if (params.q) query.set('q', params.q);
    const qs = query.toString();
    return apiClient.get<Snippet[]>(`/snippets${qs ? `?${qs}` : ''}`);
  },
  create: (values: SnippetFormValues): Promise<Snippet> =>
    apiClient.post<Snippet>('/snippets', toPayload(values)),
  update: (id: number, values: SnippetFormValues): Promise<Snippet> =>
    apiClient.patch<Snippet>(`/snippets/${id}`, toPayload(values)),
  remove: (id: number): Promise<{ id: number }> => apiClient.delete<{ id: number }>(`/snippets/${id}`),
  tags: (): Promise<Tag[]> => apiClient.get<Tag[]>('/tags'),
  languages: (): Promise<LanguageOption[]> => apiClient.get<LanguageOption[]>('/languages'),
};
