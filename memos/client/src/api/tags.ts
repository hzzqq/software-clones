import { apiClient } from './client';
import { Tag } from '../types';

export const tagApi = {
  list: () => apiClient.get<Tag[]>('/tags'),
};
