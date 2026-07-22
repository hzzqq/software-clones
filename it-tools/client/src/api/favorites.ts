import { apiClient } from './client';

/** Favorite entry shape returned by the backend. */
export interface Favorite {
  id: number;
  toolKey: string;
  title: string;
  data: string;
  createdAt: string;
}

export interface FavoriteInput {
  toolKey: string;
  title: string;
  data: string;
}

export const favoritesApi = {
  list: (): Promise<Favorite[]> => apiClient.get<Favorite[]>('/favorites'),
  create: (input: FavoriteInput): Promise<Favorite> =>
    apiClient.post<Favorite>('/favorites', input),
  remove: (id: number): Promise<null> => apiClient.delete<null>(`/favorites/${id}`),
};
