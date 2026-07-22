import { apiClient } from './client';
import type { Episode } from '../types';

export const episodeApi = {
  toggle: (id: number) => apiClient.patch<Episode>(`/episodes/${id}/toggle`),
  setWatched: (id: number, watched: boolean) =>
    apiClient.patch<Episode>(`/episodes/${id}`, { watched }),
};
