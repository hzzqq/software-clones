import { apiClient } from './client';
import { Article, ArticlesResponse } from '../types';

export interface ArticleQuery {
  feedId?: number;
  unread?: boolean;
  q?: string;
}

export const articleApi = {
  list: (query: ArticleQuery = {}) => {
    const params = new URLSearchParams();
    if (query.feedId !== undefined) params.set('feedId', String(query.feedId));
    if (query.unread !== undefined) params.set('unread', String(query.unread));
    if (query.q) params.set('q', query.q);
    const qs = params.toString();
    return apiClient.get<ArticlesResponse>(`/items${qs ? `?${qs}` : ''}`);
  },
  get: (id: number) => apiClient.get<Article>(`/items/${id}`),
  markRead: (id: number) => apiClient.post<Article>(`/items/${id}/read`),
  markAllRead: (feedId?: number) =>
    apiClient.post<{ changes: number }>('/items/read-all', feedId ? { feedId } : {}),
};
