import { useCallback, useEffect, useState } from 'react';
import { widgetsApi, CreateWidgetInput, UpdateWidgetInput } from '../api/widgets';
import { ApiError } from '../api/client';
import { Widget, WidgetDTO, WidgetLayout } from '../types';
import { parseDto, normalizeLayout } from '../utils/widget';

/** Loads and mutates the dashboard widgets. */
export function useWidgets() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const list: WidgetDTO[] = await widgetsApi.list();
      setWidgets(list.map(parseDto));
      setError('');
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addWidget = useCallback(
    async (input: CreateWidgetInput): Promise<Widget> => {
      const dto = await widgetsApi.create(input);
      const w = parseDto(dto);
      setWidgets((prev) => [...prev, w]);
      return w;
    },
    []
  );

  const updateWidget = useCallback(
    async (id: number, patch: UpdateWidgetInput): Promise<void> => {
      const dto = await widgetsApi.update(id, patch);
      const w = parseDto(dto);
      setWidgets((prev) => prev.map((x) => (x.id === id ? w : x)));
    },
    []
  );

  const removeWidget = useCallback(async (id: number): Promise<void> => {
    await widgetsApi.remove(id);
    setWidgets((prev) => prev.filter((x) => x.id !== id));
  }, []);

  // Optimistic layout update + persistence (called from drag/resize stop).
  const updateLayout = useCallback(
    async (id: number, layout: WidgetLayout): Promise<void> => {
      const safe = normalizeLayout(layout);
      setWidgets((prev) => prev.map((x) => (x.id === id ? { ...x, layout: safe } : x)));
      await widgetsApi.update(id, { layout: safe });
    },
    []
  );

  return {
    widgets,
    loading,
    error,
    reload: load,
    addWidget,
    updateWidget,
    removeWidget,
    updateLayout,
  };
}
