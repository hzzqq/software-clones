# memos

碎片化笔记 / 记忆：时间线记录、可见性管理与检索。

## 技术栈

- 前端：Vite + React 18 + TypeScript(strict) + MUI 5 + Tailwind 3
- 后端：Express 4 + TypeScript(strict) + better-sqlite3 + dotenv + cors

## 运行

```bash
# 前端
cd memos/client && npm install && npm run dev

# 后端
cd memos/server && npm install && npm run dev
```

后端默认从 `.env`（见 `server/.env.example`）读取 `PORT` / `CORS_ORIGIN` / `DB_PATH`，
首次启动自动建表（读 `src/schema.sql`），SQLite 落在 `memos/server/data/app.db`。

## 目录结构

- `client/` — React + Vite 前端（`npm run dev` 启动，`npm run test` 跑单元用例）
- `server/` — Express 后端（REST 接口前缀 `/api`，SQLite 持久化）

> 共享约定（响应信封、`camelCase`↔`snake_case`、`VITE_API_BASE` 注入等）见仓库根
> [README.md](../../README.md) 与 [B1-architecture.md](../../B1-architecture.md)。
