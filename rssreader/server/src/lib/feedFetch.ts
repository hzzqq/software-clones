import { parseRss, ParsedFeed } from './xml';

const FETCH_TIMEOUT_MS = 10_000;

/** 抓取订阅源 XML（Node 原生 fetch + 超时保护，零依赖）。 */
export async function fetchFeedXml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'rssreader-clone/1.0',
        Accept:
          'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`订阅源返回 HTTP ${res.status}`);
    }
    const text = await res.text();
    if (!text.trim()) {
      throw new Error('订阅源返回内容为空');
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** 抓取并解析订阅源；既无标题也无条目时视为无效源。 */
export async function fetchAndParseFeed(url: string): Promise<ParsedFeed> {
  const xml = await fetchFeedXml(url);
  const parsed = parseRss(xml);
  if (!parsed.title && parsed.items.length === 0) {
    throw new Error('无法识别 RSS/Atom 订阅源（未找到标题或文章）');
  }
  return parsed;
}
