import { useCallback, useEffect, useState } from 'react';
import { favoritesApi, Favorite } from '../api/favorites';
import { useLocalStorage } from './useLocalStorage';

const LS_KEY = 'it-tools:favorites';

/**
 * Manages the user's favorites. Reads/writes through the backend API first and
 * transparently falls back to `localStorage` when the backend is unreachable
 * (offline / single-machine use without a server).
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [backendOk, setBackendOk] = useState<boolean>(true);
  const [localFavs, setLocalFavs] = useLocalStorage<Favorite[]>(LS_KEY, []);

  const load = useCallback(async (): Promise<void> => {
    try {
      const data: Favorite[] = await favoritesApi.list();
      setFavorites(data);
      setBackendOk(true);
    } catch {
      setBackendOk(false);
      setFavorites(localFavs);
    }
  }, [localFavs]);

  useEffect(() => {
    void load();
  }, [load]);

  const isFavorite = useCallback(
    (toolKey: string): boolean => favorites.some((f) => f.toolKey === toolKey),
    [favorites]
  );

  const add = useCallback(
    async (toolKey: string, title: string, data: string): Promise<void> => {
      if (backendOk) {
        try {
          const created: Favorite = await favoritesApi.create({ toolKey, title, data });
          setFavorites((prev) => [created, ...prev.filter((f) => f.toolKey !== toolKey)]);
          return;
        } catch {
          setBackendOk(false);
        }
      }
      const offline: Favorite = {
        id: -Date.now(),
        toolKey,
        title,
        data,
        createdAt: new Date().toISOString(),
      };
      setLocalFavs((prev) => [offline, ...prev.filter((f) => f.toolKey !== toolKey)]);
      setFavorites((prev) => [offline, ...prev.filter((f) => f.toolKey !== toolKey)]);
    },
    [backendOk, setLocalFavs]
  );

  const remove = useCallback(
    async (id: number, toolKey: string): Promise<void> => {
      if (backendOk && id > 0) {
        try {
          await favoritesApi.remove(id);
          setFavorites((prev) => prev.filter((f) => f.id !== id));
          return;
        } catch {
          setBackendOk(false);
        }
      }
      setLocalFavs((prev) => prev.filter((f) => f.toolKey !== toolKey));
      setFavorites((prev) => prev.filter((f) => f.toolKey !== toolKey));
    },
    [backendOk, setLocalFavs]
  );

  const toggle = useCallback(
    (toolKey: string, title: string, data: string): Promise<void> => {
      const existing: Favorite | undefined = favorites.find((f) => f.toolKey === toolKey);
      if (existing) {
        return remove(existing.id, toolKey);
      }
      return add(toolKey, title, data);
    },
    [favorites, add, remove]
  );

  const clearAll = useCallback(async (): Promise<void> => {
    if (backendOk) {
      try {
        await Promise.all(
          favorites.filter((f) => f.id > 0).map((f) => favoritesApi.remove(f.id))
        );
      } catch {
        setBackendOk(false);
      }
    }
    setLocalFavs([]);
    setFavorites([]);
  }, [backendOk, favorites, setLocalFavs]);

  return { favorites, isFavorite, toggle, clearAll, backendOk };
}
