import { useCallback, useEffect, useState } from 'react';
import { linkApi } from '../api/links';
import { ShortLink } from '../types';

/**
 * 短链接列表数据 hook：负责加载、创建、删除、刷新。
 * 所有写操作成功后都会刷新列表，保证 UI 与后端一致。
 */
export function useLinks() {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [summary, setSummary] = useState({ total: 0, totalClicks: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const data = await linkApi.list();
      setLinks(data.links);
      setSummary(data.summary);
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

  const create = useCallback(
    async (input: { url: string; title?: string }): Promise<ShortLink> => {
      const link = await linkApi.create(input);
      await refresh();
      return link;
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      await linkApi.remove(id);
      await refresh();
    },
    [refresh]
  );

  return { links, summary, loading, error, refresh, create, remove };
}
