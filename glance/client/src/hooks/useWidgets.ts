import { useCallback, useEffect, useState } from 'react';
import { widgetsApi, CreateWidgetInput, UpdateWidgetInput } from '../api/widgets';
import { ApiError } from '../api/client';
import { Widget, WidgetDTO, WidgetLayout } from '../types';

/** Parses the raw API widget (JSON strings) into the client `Widget`. */
function parseDto(d: WidgetDTO): Widget {
  return {
    id: d.id,
    type: d.type as Widget['type'],
    title: d.title,
    layout: JSON.parse(d.layoutJson) as WidgetLayout,
    config: JSON.parse(d.configJson),
    enabled: d.enabled === 1,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

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
      setWidgets((prev) => prev.map((x) => (x.id === id ? { ...x, layout } : x)));
      await widgetsApi.update(id, { layout });
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
