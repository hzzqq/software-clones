import { apiClient } from './client';
import { ChecklistItem } from '../types';

export interface ChecklistItemInput {
  text: string;
  position?: number;
  done?: number;
}

export type ChecklistItemPatch = Partial<{
  text: string;
  done: number;
  position: number;
}>;

export const checklistApi = {
  listByCard: (cardId: number): Promise<ChecklistItem[]> =>
    apiClient.get<ChecklistItem[]>(`/cards/${cardId}/checklist`),
  create: (cardId: number, input: ChecklistItemInput): Promise<ChecklistItem> =>
    apiClient.post<ChecklistItem>(`/cards/${cardId}/checklist`, input),
  update: (itemId: number, patch: ChecklistItemPatch): Promise<ChecklistItem> =>
    apiClient.patch<ChecklistItem>(`/checklist/${itemId}`, patch),
  remove: (itemId: number): Promise<null> => apiClient.delete<null>(`/checklist/${itemId}`),
};
