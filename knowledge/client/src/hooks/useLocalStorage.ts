import { useCallback, useEffect, useState } from 'react';

/**
 * Persists a piece of state in `localStorage`, keeping React state and storage
 * in sync. Falls back gracefully when storage is unavailable (e.g. SSR/private
 * mode).
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const readValue = useCallback((): T => {
    try {
      const item: string | null = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)): void => {
      setStoredValue((prev) => {
        const next: T = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Ignore write failures (quota / disabled storage).
        }
        return next;
      });
    },
    [key]
  );

  useEffect(() => {
    const handleStorage = (event: StorageEvent): void => {
      if (event.key === key) {
        setStoredValue(readValue());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key, readValue]);

  return [storedValue, setValue];
}
