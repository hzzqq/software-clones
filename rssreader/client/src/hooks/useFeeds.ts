import { useCallback, useEffect, useState } from 'react';
import { feedApi } from '../api/feeds';
import { Feed } from '../types';

/**
 * 订阅源数据 hook：加载 / 添加 / 删除 / 刷新。
 */
export function useFeeds() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const data = await feedApi.list();
      setFeeds(data.feeds);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (input: { url: string; category?: string }) => {
      const result = await feedApi.add(input);
      await refresh();
      return result;
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      await feedApi.remove(id);
      await refresh();
    },
    [refresh]
  );

  const refreshOne = useCallback(
    async (id: number) => {
      const result = await feedApi.refresh(id);
      await refresh();
      return result;
    },
    [refresh]
  );

  return { feeds, loading, error, refresh, add, remove, refreshOne };
}
