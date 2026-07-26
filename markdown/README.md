# markdown

Markdown 编辑 / 预览：笔记列表、即时搜索、本地持久化。

## 技术栈

- 前端：Vite + React 18 + TypeScript(strict) + MUI 5 + Tailwind 3
- 后端：Express 4 + TypeScript(strict) + better-sqlite3 + dotenv + cors

## 运行

```bash
# 前端
cd markdown/client && npm install && npm run dev

# 后端
cd markdown/server && npm install && npm run dev
```

后端默认从 `.env`（见 `server/.env.example`）读取 `PORT` / `CORS_ORIGIN` / `DB_PATH`，
首次启动自动建表（读 `src/schema.sql`），SQLite 落在 `markdown/server/data/app.db`。

## 目录结构

- `client/` — React + Vite 前端（`npm run dev` 启动，`npm run test` 跑单元用例）
- `server/` — Express 后端（REST 接口前缀 `/api`，SQLite 持久化）

> 共享约定（响应信封、`camelCase`↔`snake_case`、`VITE_API_BASE` 注入等）见仓库根
> [README.md](../../README.md) 与 [B1-architecture.md](../../B1-architecture.md)。


## 验证

```bash
# 在仓库根运行统一验收（结构一致性 + 规则单测 + 本 App 的 client 单测）
npm test
```

> 单独验证本 App：`npm run test:app <name>`（见仓库根 CONTRIBUTING.md）。
