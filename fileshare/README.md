# fileshare

文件分享：上传文件 → 生成短码分享链接 → 任何人可下载，下载次数持久化。

## 技术栈

- 前端：Vite + React 18 + TypeScript(strict) + MUI 5 + Tailwind 3
- 后端：Express 4 + TypeScript(strict) + better-sqlite3 + dotenv + cors

## 运行

```bash
# 前端
cd fileshare/client && npm install && npm run dev

# 后端
cd fileshare/server && npm install && npm run dev
```

后端默认从 `.env`（见 `server/.env.example`）读取 `PORT` / `CORS_ORIGIN` / `DB_PATH` /
`UPLOAD_DIR` / `MAX_FILE_SIZE`，首次启动自动建表（读 `src/schema.sql`），
SQLite 落在 `fileshare/server/data/app.db`，上传文件落在 `fileshare/server/data/uploads/`。

仓库根 `scripts/start-app.mjs fileshare` 可一键拉起前后端（端口 4219 / 5199）。

## 核心接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/files` | 上传（`application/octet-stream`，文件名走 `X-File-Name` 头） |
| GET | `/api/files` | 文件列表 |
| GET | `/api/files/:code/meta` | 短码查文件元信息 |
| GET | `/api/files/:code/download` | 下载原文件（下载计数 +1，UTF-8 文件名） |
| DELETE | `/api/files/:id` | 删除文件（连磁盘文件） |

## 验证

```bash
cd fileshare/client && npm run typecheck && npm test
cd fileshare/server && npm run typecheck && npm test
```

> 共享约定（响应信封、`camelCase`↔`snake_case`、`VITE_API_BASE` 注入等）见仓库根
> [README.md](../../README.md) 与 [B1-architecture.md](../../B1-architecture.md)。
