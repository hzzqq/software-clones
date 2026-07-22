import { apiClient } from './client';
import { Tag } from '../types';

export interface TagInput {
  boardId: number;
  name: string;
  color: string;
}

export const tagsApi = {
  create: (input: TagInput): Promise<Tag> =>
    apiClient.post<Tag>('/tags', input),
  remove: (id: number): Promise<null> =>
    apiClient.delete<null>(`/tags/${id}`),
};
