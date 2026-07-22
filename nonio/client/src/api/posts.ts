import { apiClient } from './client';
import type { Post } from '../types';

export const postApi = {
  list: (params?: { channelId?: number; tag?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.channelId) qs.set('channelId', String(params.channelId));
    if (params?.tag) qs.set('tag', params.tag);
    if (params?.q) qs.set('q', params.q);
    const q = qs.toString();
    return apiClient.get<Post[]>(`/posts${q ? `?${q}` : ''}`);
  },
  get: (id: number) => apiClient.get<Post>(`/posts/${id}`),
  create: (input: {
    channelId: number;
    title: string;
    body: string;
    authorName?: string;
    tags?: string[];
  }) => apiClient.post<Post>('/posts', input),
  update: (id: number, input: { title?: string; body?: string; tags?: string[] }) =>
    apiClient.patch<Post>(`/posts/${id}`, input),
  remove: (id: number) => apiClient.delete<{ deleted: boolean }>(`/posts/${id}`),
  like: (id: number) => apiClient.post<Post>(`/posts/${id}/like`),
};
