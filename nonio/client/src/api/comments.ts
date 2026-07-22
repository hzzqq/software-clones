import { apiClient } from './client';
import type { Comment } from '../types';

export const commentApi = {
  listByPost: (postId: number) =>
    apiClient.get<Comment[]>(`/comments/post/${postId}`),
  create: (input: {
    postId: number;
    parentId?: number | null;
    authorName?: string;
    body: string;
  }) => apiClient.post<Comment>('/comments', input),
  remove: (id: number) => apiClient.delete<{ deleted: boolean }>(`/comments/${id}`),
  like: (id: number) => apiClient.patch<Comment>(`/comments/${id}`, { like: true }),
};
