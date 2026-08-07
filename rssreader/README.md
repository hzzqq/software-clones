# RSS 阅读器 · RSSReader 克隆

RSS / Atom 订阅聚合阅读器：添加订阅、抓取解析、文章列表、已读管理、全文阅读。

## 功能

- 订阅源管理：添加（URL + 分类）/ 删除（级联文章）/ 手动刷新，展示未读数与最近抓取时间
- RSS 解析零依赖：Node 原生 `fetch` 抓 XML + 手写轻量解析器（`server/src/lib/xml.ts`，处理 CDATA、实体、RFC822 日期、RSS 2.0 与 Atom）
- 文章列表：按订阅源 / 未读 / 关键词筛选；已读 / 未读标记；全部标为已读
- 全文阅读视图：进入自动标已读；正文经白名单 HTML 清洗（防 XSS）
- 持久化：后端 SQLite（feeds 表 + items 表，按 feed_id+guid 去重）

## 运行

```bash
# 前端
cd rssreader/client && npm install && npm run dev      # http://localhost:5194

# 后端
cd rssreader/server && npm install && npm run dev      # http://localhost:4214
```

或从仓库根一键拉起：

```bash
node scripts/start-app.mjs rssreader
```

## 验证

```bash
cd rssreader/client && npm test        # vitest（sanitize / format / feedUrl 单测）
cd rssreader/server && npm test        # vitest（XML 解析 + API 集成测试，含本地 mock RSS 源）
```

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/feeds` | 全部订阅源（含未读 / 文章数） |
| POST | `/api/feeds` | 添加订阅 `{ url, category? }`（抓取 + 首拉文章） |
| DELETE | `/api/feeds/:id` | 删除订阅（级联文章） |
| POST | `/api/feeds/:id/refresh` | 手动刷新（增量入库，返回新增数） |
| GET | `/api/items?feedId=&unread=&q=` | 文章列表（可筛选） |
| GET | `/api/items/:id` | 文章详情 |
| POST | `/api/items/:id/read` | 标为已读 |
| POST | `/api/items/read-all` | 全部标为已读（可选 `feedId`） |
