import { apiClient } from './client';
import type { Bookmark, BookmarkFormValues } from '../types';

export interface BookmarkListParams {
  categoryId?: number | null;
  uncategorized?: boolean;
  q?: string;
}

export const bookmarksApi = {
  list: (params: BookmarkListParams = {}): Promise<Bookmark[]> => {
    const query = new URLSearchParams();
    if (params.uncategorized) {
      query.set('uncategorized', '1');
    } else if (params.categoryId !== undefined && params.categoryId !== null) {
      query.set('categoryId', String(params.categoryId));
    }
    if (params.q) {
      query.set('q', params.q);
    }
    const qs = query.toString();
    return apiClient.get<Bookmark[]>(`/bookmarks${qs ? `?${qs}` : ''}`);
  },
  create: (values: BookmarkFormValues): Promise<Bookmark> =>
    apiClient.post<Bookmark>('/bookmarks', values),
  update: (id: number, values: Partial<BookmarkFormValues>): Promise<Bookmark> =>
    apiClient.patch<Bookmark>(`/bookmarks/${id}`, values),
  remove: (id: number): Promise<{ id: number }> => apiClient.delete<{ id: number }>(`/bookmarks/${id}`),
};
