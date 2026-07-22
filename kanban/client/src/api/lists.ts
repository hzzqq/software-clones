import { apiClient } from './client';
import { List } from '../types';

export interface ListInput {
  boardId: number;
  title: string;
  position: number;
}

export const listsApi = {
  create: (input: ListInput): Promise<List> =>
    apiClient.post<List>('/lists', input),
  update: (
    id: number,
    patch: { title?: string; position?: number }
  ): Promise<List> => apiClient.patch<List>(`/lists/${id}`, patch),
  remove: (id: number): Promise<null> =>
    apiClient.delete<null>(`/lists/${id}`),
};
