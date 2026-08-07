import { apiClient } from './client';
import type { Category } from '../types';

export interface CategoryInput {
  name: string;
}

export const categoriesApi = {
  list: (): Promise<Category[]> => apiClient.get<Category[]>('/categories'),
  create: (name: string): Promise<Category> =>
    apiClient.post<Category>('/categories', { name } satisfies CategoryInput),
  rename: (id: number, name: string): Promise<Category> =>
    apiClient.patch<Category>(`/categories/${id}`, { name } satisfies CategoryInput),
  remove: (id: number): Promise<{ id: number }> => apiClient.delete<{ id: number }>(`/categories/${id}`),
};
