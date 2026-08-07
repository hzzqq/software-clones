import { apiClient } from './client';
import { Feed, FeedsResponse } from '../types';

export interface FeedWithAdded {
  feed: Feed;
  added: number;
}

export const feedApi = {
  list: () => apiClient.get<FeedsResponse>('/feeds'),
  add: (input: { url: string; category?: string }) =>
    apiClient.post<FeedWithAdded>('/feeds', input),
  remove: (id: number) => apiClient.delete<{ id: number }>(`/feeds/${id}`),
  refresh: (id: number) => apiClient.post<FeedWithAdded>(`/feeds/${id}/refresh`),
};
