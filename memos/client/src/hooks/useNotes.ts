import { useCallback, useEffect, useState } from 'react';
import { Note } from '../types';
import { noteApi, NoteQuery } from '../api/notes';

/** Loads notes for a given filter and exposes a manual reload. */
export function useNotes(query: NoteQuery = {}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify(query);
  const reload = useCallback(() => {
    setLoading(true);
    noteApi
      .list(query)
      .then((data) => {
        setNotes(data);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { notes, loading, error, reload };
}
