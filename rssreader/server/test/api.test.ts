import http from 'http';
import path from 'path';
import os from 'os';
import fs from 'fs';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, it, expect } from 'vitest';

// Use an isolated temp DB so tests never touch the real data file.
const dbFile = path.join(os.tmpdir(), `rssreader-server-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = dbFile;

const { app } = await import('../src/app');
const { db } = await import('../src/db');

// 本地 mock RSS 源：让「添加订阅/刷新」走通 真实 fetch → 解析 → 入库 全链路。
const RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>测试频道</title>
    <link>http://127.0.0.1:PORT_PLACEHOLDER</link>
    <description>测试频道简介</description>
    <item>
      <title>测试文章一</title>
      <link>http://127.0.0.1:PORT_PLACEHOLDER/post/1</link>
      <description><![CDATA[<p>内容一</p>]]></description>
      <pubDate>Mon, 03 Jun 2024 08:00:00 GMT</pubDate>
      <guid>http://127.0.0.1:PORT_PLACEHOLDER/post/1</guid>
    </item>
    <item>
      <title>测试文章二</title>
      <link>http://127.0.0.1:PORT_PLACEHOLDER/post/2</link>
      <description>内容二</description>
      <pubDate>Sun, 02 Jun 2024 08:00:00 GMT</pubDate>
      <guid>http://127.0.0.1:PORT_PLACEHOLDER/post/2</guid>
    </item>
  </channel>
</rss>`;

/** 当前 mock 源要返回的 XML（beforeEach 会重置为 RSS_XML）。 */
let currentXml = RSS_XML;

let mockServer: http.Server;
let mockPort: number;
let feedUrl = '';

beforeAll(async () => {
  mockServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
    res.end(currentXml.replace(/PORT_PLACEHOLDER/g, String(mockPort)));
  });
  await new Promise<void>((resolve) => {
    mockServer.listen(0, '127.0.0.1', () => {
      const addr = mockServer.address();
      mockPort = typeof addr === 'object' && addr ? addr.port : 0;
      feedUrl = `http://127.0.0.1:${mockPort}/feed.xml`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => mockServer.close(() => resolve()));
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.rmSync(dbFile + suffix, { force: true });
    } catch {
      /* ignore */
    }
  }
});

beforeEach(() => {
  currentXml = RSS_XML;
  db.exec('DELETE FROM items; DELETE FROM feeds;');
});

describe('feeds CRUD + fetch', () => {
  it('adds a feed by fetching and parsing the RSS', async () => {
    const res = await request(app).post('/api/feeds').send({ url: feedUrl });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.feed.id).toBeGreaterThan(0);
    expect(res.body.data.feed.title).toBe('测试频道');
    expect(res.body.data.feed.url).toBe(feedUrl);
    expect(res.body.data.feed.unreadCount).toBe(2);
    expect(res.body.data.added).toBe(2);
  });

  it('rejects duplicate feed urls', async () => {
    await request(app).post('/api/feeds').send({ url: feedUrl });
    const res = await request(app).post('/api/feeds').send({ url: feedUrl });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe(40900);
  });

  it('rejects invalid feed urls', async () => {
    const res = await request(app).post('/api/feeds').send({ url: 'not a url' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('rejects non-http protocols', async () => {
    const res = await request(app)
      .post('/api/feeds')
      .send({ url: 'ftp://example.com/feed.xml' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('rejects unreachable feed urls', async () => {
    const res = await request(app)
      .post('/api/feeds')
      .send({ url: 'http://127.0.0.1:1/nonexistent.xml' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40002);
  });

  it('lists feeds with unread/item counts', async () => {
    await request(app).post('/api/feeds').send({ url: feedUrl, category: '技术' });
    const res = await request(app).get('/api/feeds');
    expect(res.status).toBe(200);
    expect(res.body.data.feeds).toHaveLength(1);
    expect(res.body.data.feeds[0].category).toBe('技术');
    expect(res.body.data.feeds[0].unreadCount).toBe(2);
    expect(res.body.data.feeds[0].itemCount).toBe(2);
  });

  it('deletes a feed and cascades its items', async () => {
    const created = await request(app).post('/api/feeds').send({ url: feedUrl });
    const feedId = created.body.data.feed.id;
    expect((await request(app).get('/api/items')).body.data.items).toHaveLength(2);

    const del = await request(app).delete(`/api/feeds/${feedId}`);
    expect(del.status).toBe(200);
    const list = await request(app).get('/api/items');
    expect(list.body.data.items).toHaveLength(0);
  });

  it('refresh only inserts new items (dedupe by guid)', async () => {
    const created = await request(app).post('/api/feeds').send({ url: feedUrl });
    const feedId = created.body.data.feed.id;

    // 首次 refresh：无新增（guid 均已存在）。
    const refresh1 = await request(app).post(`/api/feeds/${feedId}/refresh`);
    expect(refresh1.status).toBe(200);
    expect(refresh1.body.data.added).toBe(0);

    // mock 源新增一篇文章后再 refresh（插到 </channel> 之前，保证能被解析）。
    currentXml = RSS_XML.replace(/PORT_PLACEHOLDER/g, String(mockPort)).replace(
      '</channel>',
      `<item>
      <title>测试文章三</title>
      <link>http://127.0.0.1:${mockPort}/post/3</link>
      <description>内容三</description>
      <guid>http://127.0.0.1:${mockPort}/post/3</guid>
    </item></channel>`
    );

    const refresh2 = await request(app).post(`/api/feeds/${feedId}/refresh`);
    expect(refresh2.body.data.added).toBe(1);
    expect((await request(app).get('/api/items')).body.data.items).toHaveLength(3);
  });
});

describe('items list / read', () => {
  async function addFeed(): Promise<number> {
    const created = await request(app).post('/api/feeds').send({ url: feedUrl });
    return created.body.data.feed.id as number;
  }

  it('lists items sorted by pubDate desc with feed title', async () => {
    await addFeed();
    const res = await request(app).get('/api/items');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items[0].title).toBe('测试文章一');
    expect(res.body.data.items[0].feedTitle).toBe('测试频道');
    expect(res.body.data.items[0].isRead).toBe(false);
    expect(res.body.data.totalUnread).toBe(2);
  });

  it('filters by feedId', async () => {
    const feedId = await addFeed();
    const res = await request(app).get(`/api/items?feedId=${feedId}`);
    expect(res.body.data.items).toHaveLength(2);
    const empty = await request(app).get('/api/items?feedId=99999');
    expect(empty.body.data.items).toHaveLength(0);
  });

  it('marks a single item as read', async () => {
    await addFeed();
    const items = (await request(app).get('/api/items')).body.data.items;
    const firstId = items[0].id as number;
    const res = await request(app).post(`/api/items/${firstId}/read`);
    expect(res.status).toBe(200);
    expect(res.body.data.isRead).toBe(true);
    const unread = await request(app).get('/api/items?unread=true');
    expect(unread.body.data.items).toHaveLength(1);
  });

  it('marks all read (optionally per feed)', async () => {
    await addFeed();
    const all = await request(app).post('/api/items/read-all').send({});
    expect(all.status).toBe(200);
    expect(all.body.data.changes).toBe(2);
    expect((await request(app).get('/api/items?unread=true')).body.data.items).toHaveLength(0);
  });

  it('returns 404 for missing item', async () => {
    const res = await request(app).get('/api/items/99999');
    expect(res.status).toBe(404);
  });
});
