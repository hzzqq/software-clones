import { apiClient } from './client';
import { Board, BoardDetail } from '../types';

export const boardsApi = {
  list: (): Promise<Board[]> => apiClient.get<Board[]>('/boards'),
  create: (name: string): Promise<Board> =>
    apiClient.post<Board>('/boards', { name }),
  get: (id: number): Promise<BoardDetail> =>
    apiClient.get<BoardDetail>(`/boards/${id}`),
  update: (id: number, name: string): Promise<Board> =>
    apiClient.patch<Board>(`/boards/${id}`, { name }),
  remove: (id: number): Promise<null> =>
    apiClient.delete<null>(`/boards/${id}`),
};
