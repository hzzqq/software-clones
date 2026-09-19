# 双链大纲笔记 · Knowledge

复刻 Logseq 的**双链大纲笔记**：页面（Page）+ 可折叠大纲块树（Block），支持
`[[页面名]]` 与 `((块id))` 引用，并提供**反链（Backlinks）面板**。数据持久化于后端
SQLite（better-sqlite3）。

## 目录结构

- `server/` —— Express + better-sqlite3 后端（端口由 `PORT` 注入，默认 `4224`）
- `client/` —— Vite + React + MUI 前端（端口由启动器注入，默认 `5204`）

## 后端运行

```bash
cd knowledge/server
npm install
npm run dev          # tsx watch src/index.ts
# 或生产构建
npm run build && npm start
```

## 前端运行

```bash
cd knowledge/client
npm install
npm run dev
```

## 测试（服务端 vitest）

```bash
cd knowledge/server
npm test
```

## API 摘要

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/pages` | 页面列表 |
| POST | `/api/pages` | 创建页面 `{ title }` |
| GET | `/api/pages/:id` | 页面 + 大纲树 |
| PATCH | `/api/pages/:id` | 重命名 `{ title }` |
| DELETE | `/api/pages/:id` | 删除页面（级联块与引用） |
| GET | `/api/pages/:id/backlinks` | 页面反链 |
| POST | `/api/blocks` | 创建块 `{ pageId, parentId?, content?, sortOrder? }` |
| GET | `/api/blocks/:id` | 块详情 |
| PATCH | `/api/blocks/:id` | 更新块（保存时重算引用） |
| DELETE | `/api/blocks/:id` | 删除块（级联子块与引用） |
| GET | `/api/blocks/:id/backlinks` | 块反链 |
| GET | `/api/search?q=` | 搜索页面与块内容 |

## 数据模型

- `pages(id, title UNIQUE, created_at, updated_at)`
- `blocks(id, page_id, parent_id 自引用, content, sort_order, created_at, updated_at)`
- `block_links(id, from_block_id, to_page_id, to_block_id)`
