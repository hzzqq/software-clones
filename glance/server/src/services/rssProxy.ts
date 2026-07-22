import Parser from 'rss-parser';

export interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  contentSnippet?: string;
}

export interface RssFeed {
  title: string;
  items: RssItem[];
}

interface CacheEntry {
  value: RssFeed;
  expires: number;
}

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();
const parser = new Parser();

/**
 * Fetches and parses an RSS/Atom feed on the server (avoids browser CORS).
 * Results are cached in memory for `TTL_MS` to limit upstream calls.
 */
export async function fetchRss(url: string, maxItems = 20): Promise<RssFeed> {
  const now: number = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) {
    return hit.value;
  }

  const feed = await parser.parseURL(url);
  const items: RssItem[] = (feed.items ?? [])
    .slice(0, maxItems)
    .map((item) => ({
      title: item.title ?? '(无标题)',
      link: item.link ?? '',
      pubDate: item.isoDate ?? (item.pubDate ? String(item.pubDate) : undefined),
      contentSnippet: (item.contentSnippet ?? '').slice(0, 300),
    }));

  const result: RssFeed = { title: feed.title ?? url, items };
  cache.set(url, { value: result, expires: now + TTL_MS });
  return result;
}
