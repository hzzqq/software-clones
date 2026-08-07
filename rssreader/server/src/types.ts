/** RSS 阅读器领域类型（JSON 侧 camelCase）。 */

export interface Feed {
  id: number;
  title: string;
  url: string;
  category: string;
  createdAt: string;
  lastFetchedAt: string | null;
  /** 未读文章数（列表页展示）。 */
  unreadCount: number;
  /** 文章总数。 */
  itemCount: number;
}

export interface FeedRow {
  id: number;
  title: string;
  url: string;
  category: string;
  created_at: string;
  last_fetched_at: string | null;
}

export interface Article {
  id: number;
  feedId: number;
  feedTitle: string;
  guid: string;
  title: string;
  link: string;
  description: string;
  content: string;
  author: string;
  pubDate: string;
  isRead: boolean;
  createdAt: string;
}

export interface ArticleRow {
  id: number;
  feed_id: number;
  guid: string;
  title: string;
  link: string;
  description: string;
  content: string;
  author: string;
  pub_date: string;
  is_read: number;
  created_at: string;
  feed_title: string;
}
