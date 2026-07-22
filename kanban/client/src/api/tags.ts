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
  update: (id: number, patch: Partial<TagInput>): Promise<Tag> =>
    apiClient.put<Tag>(`/tags/${id}`, patch),
  remove: (id: number): Promise<null> =>
    apiClient.delete<null>(`/tags/${id}`),
};
