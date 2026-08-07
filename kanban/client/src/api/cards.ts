import { apiClient } from './client';
import { Card } from '../types';

export interface CardInput {
  listId: number;
  title: string;
  position: number;
  description?: string;
  dueDate?: string | null;
  priority?: number;
  completed?: number;
  assignee?: string;
}

export type CardPatch = Partial<{
  title: string;
  description: string;
  dueDate: string | null;
  priority: number;
  completed: number;
  assignee: string;
  position: number;
  listId: number;
}>;

export const cardsApi = {
  listByList: (listId: number): Promise<Card[]> =>
    apiClient.get<Card[]>(`/lists/${listId}/cards`),
  create: (input: CardInput): Promise<Card> =>
    apiClient.post<Card>('/cards', input),
  get: (id: number): Promise<Card> => apiClient.get<Card>(`/cards/${id}`),
  update: (id: number, patch: CardPatch): Promise<Card> =>
    apiClient.patch<Card>(`/cards/${id}`, patch),
  remove: (id: number): Promise<null> =>
    apiClient.delete<null>(`/cards/${id}`),
  addTag: (id: number, tagId: number): Promise<null> =>
    apiClient.post<null>(`/cards/${id}/tags`, { tagId }),
  removeTag: (id: number, tagId: number): Promise<null> =>
    apiClient.delete<null>(`/cards/${id}/tags/${tagId}`),
};
