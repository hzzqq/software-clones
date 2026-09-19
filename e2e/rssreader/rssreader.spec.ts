/**
 * rssreader E2E 冒烟：应用挂载 + 后端健康；订阅源（feed）与文章（item）的本地
 * CRUD 端到端。POST /api/feeds 依赖服务端抓取 RSS，这里在测试进程内起一个
 * loopback HTTP 服务器提供 RSS XML（Node fetch 可直达 127.0.0.1），
 * 因此不依赖外网，沙箱 / CI 无外网也不会假红。
 */
import { test, request, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('rssreader');
const API = `http://localhost:${APP.serverPort}/api`;

/** 信封内的订阅源（服务端 camelCase）。 */
interface FeedDto {
  id: number;
  title: string;
  url: string;
  category: string;
  unreadCount: number;
  itemCount: number;
}

/** 信封内的文章。 */
interface ArticleDto {
  id: number;
  feedId: number;
  guid: string;
  title: string;
  isRead: boolean;
}

/** 最小 RSS 2.0 源：一个频道 + 两篇文章（一篇带 pubDate、一篇不带，覆盖排序分支）。 */
function buildRssXml(stamp: number): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0"><channel>',
    '<title>E2E Loop Feed</title>',
    '<link>http://example.invalid/</link>',
    '<description>e2e loopback feed</description>',
    `<item><title>e2e 文章 A ${stamp}</title><link>http://example.invalid/a</link><guid>e2e-${stamp}-a</guid><pubDate>Wed, 18 Sep 2024 08:00:00 GMT</pubDate></item>`,
    `<item><title>e2e 文章 B ${stamp}</title><link>http://example.invalid/b</link><guid>e2e-${stamp}-b</guid></item>`,
    '</channel></rss>',
  ].join('\n');
}

/** 在 127.0.0.1 随机端口起一个只返回 RSS XML 的本地源，返回可访问 URL。 */
async function startLoopbackFeedServer(xml: string): Promise<{ server: Server; url: string }> {
  const server: Server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
    res.end(xml);
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = (server.address() as AddressInfo).port;
  return { server, url: `http://127.0.0.1:${port}/feed-${Date.now()}.xml` };
}

test('rssreader 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await request.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('rssreader 订阅源本地 CRUD（loopback 源，不依赖外网）', async ({ request }) => {
  const stamp = Date.now();
  const { server, url } = await startLoopbackFeedServer(buildRssXml(stamp));
  try {
    // 1) 添加订阅：服务端抓取 loopback 源并入库，返回 201 + feed 统计 + 新增文章数
    const create = await request.post(`${API}/feeds`, { data: { url, category: 'e2e' } });
    expect(create.status()).toBe(201);
    const created = (await create.json()).data as { feed: FeedDto; added: number };
    expect(created.feed.id).toBeGreaterThan(0);
    expect(created.feed.title).toBe('E2E Loop Feed');
    expect(created.feed.url).toBe(url);
    expect(created.feed.category).toBe('e2e');
    expect(created.added).toBe(2);
    expect(created.feed.unreadCount).toBe(2);
    const feedId = created.feed.id;

    // 2) 同一 URL 重复添加 → 409
    const dup = await request.post(`${API}/feeds`, { data: { url } });
    expect(dup.status()).toBe(409);

    // 3) 订阅列表确认持久化
    const list = await request.get(`${API}/feeds`);
    expect(list.status()).toBe(200);
    const feeds = (await list.json()).data as { feeds: FeedDto[] };
    expect(feeds.feeds.some((f) => f.id === feedId)).toBe(true);

    // 4) 文章已随订阅入库：按 feedId 过滤可取到 2 篇
    const itemsRes = await request.get(`${API}/items?feedId=${feedId}`);
    expect(itemsRes.status()).toBe(200);
    const items = (await itemsRes.json()).data as { items: ArticleDto[]; totalUnread: number };
    expect(items.items).toHaveLength(2);
    expect(items.items.every((it) => it.feedId === feedId)).toBe(true);

    // 5) 标为已读 → isRead 生效，未读筛选只剩 1 篇
    const first = items.items[0];
    const readRes = await request.post(`${API}/items/${first.id}/read`);
    expect(readRes.status()).toBe(200);
    expect(((await readRes.json()).data as ArticleDto).isRead).toBe(true);
    const unreadRes = await request.get(`${API}/items?feedId=${feedId}&unread=true`);
    expect(unreadRes.status()).toBe(200);
    const unread = (await unreadRes.json()).data as { items: ArticleDto[] };
    expect(unread.items).toHaveLength(1);

    // 6) 删除订阅 → 文章级联清空；重复删除 404
    const del = await request.delete(`${API}/feeds/${feedId}`);
    expect(del.status()).toBe(200);
    expect(((await del.json()).data as { id: number }).id).toBe(feedId);
    const after = await request.get(`${API}/items?feedId=${feedId}`);
    expect(((await after.json()).data as { items: ArticleDto[] }).items).toHaveLength(0);
    const delAgain = await request.delete(`${API}/feeds/${feedId}`);
    expect(delAgain.status()).toBe(404);
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
});

test('rssreader 本地负路径：参数校验与 404', async ({ request }) => {
  // 空 url → 400（纯参数校验，不触发网络抓取）
  const empty = await request.post(`${API}/feeds`, { data: { url: '   ' } });
  expect(empty.status()).toBe(400);
  expect(((await empty.json()) as { code: number }).code).toBe(40001);

  // 非 http/https 协议 → 400
  const badProto = await request.post(`${API}/feeds`, { data: { url: 'ftp://example.invalid/rss.xml' } });
  expect(badProto.status()).toBe(400);

  // 不存在的文章 → 404
  const missingItem = await request.get(`${API}/items/99999999`);
  expect(missingItem.status()).toBe(404);

  // 给不存在的文章标已读 → 404
  const missingRead = await request.post(`${API}/items/99999999/read`);
  expect(missingRead.status()).toBe(404);
});
