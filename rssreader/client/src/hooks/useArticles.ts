import { useCallback, useEffect, useState } from 'react';
import { articleApi } from '../api/articles';
import { Article } from '../types';

export interface ArticleFilter {
  feedId?: number;
  unread?: boolean;
  q?: string;
}

/**
 * 文章数据 hook：加载列表（按订阅源 / 未读 / 关键词筛选）、标已读、全部已读。
 */
export function useArticles(filter: ArticleFilter = {}) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [totalUnread, setTotalUnread] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const data = await articleApi.list(filter);
      setArticles(data.items);
      setTotalUnread(data.totalUnread);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [filter.feedId, filter.unread, filter.q]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  const markRead = useCallback(
    async (id: number): Promise<Article> => {
      const article = await articleApi.markRead(id);
      await refresh();
      return article;
    },
    [refresh]
  );

  const markAllRead = useCallback(
    async (feedId?: number): Promise<void> => {
      await articleApi.markAllRead(feedId);
      await refresh();
    },
    [refresh]
  );

  return { articles, totalUnread, loading, error, refresh, markRead, markAllRead };
}
