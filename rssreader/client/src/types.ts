/** RSS 阅读器领域类型，与后端 /api 返回结构一致。 */

export interface Feed {
  id: number;
  title: string;
  url: string;
  category: string;
  createdAt: string;
  lastFetchedAt: string | null;
  unreadCount: number;
  itemCount: number;
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

export interface FeedsResponse {
  feeds: Feed[];
}

export interface ArticlesResponse {
  items: Article[];
  totalUnread: number;
}
