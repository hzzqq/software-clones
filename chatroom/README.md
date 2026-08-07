# chatroom

多房间实时聊天室：进入房间输入昵称即聊，SSE 实时推送，消息持久化。

## 技术栈

- 前端：Vite + React 18 + TypeScript(strict) + MUI 5 + Tailwind 3
- 后端：Express 4 + TypeScript(strict) + better-sqlite3 + dotenv + cors（SSE 用原生 Node http，零新增依赖）

## 运行

```bash
# 前端
cd chatroom/client && npm install && npm run dev

# 后端
cd chatroom/server && npm install && npm run dev
```

后端默认从 `.env`（见 `server/.env.example`）读取 `PORT` / `CORS_ORIGIN` / `DB_PATH` /
`MAX_MESSAGES_PER_ROOM`，首次启动自动建表（读 `src/schema.sql`），
SQLite 落在 `chatroom/server/data/app.db`。

仓库根 `scripts/start-app.mjs chatroom` 可一键拉起前后端（端口 4220 / 5200）。

## 核心接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/rooms` | 房间列表（含消息数） |
| POST | `/api/rooms` | 创建房间 |
| GET | `/api/rooms/:id/messages` | 历史消息（默认最近 50 条） |
| POST | `/api/rooms/:id/messages` | 发消息（昵称 + 内容） |
| GET | `/api/rooms/:id/stream` | SSE 实时消息流 |

## 验证

```bash
cd chatroom/client && npm run typecheck && npm test
cd chatroom/server && npm run typecheck && npm test
```

> 共享约定（响应信封、`camelCase`↔`snake_case`、`VITE_API_BASE` 注入等）见仓库根
> [README.md](../../README.md) 与 [B1-architecture.md](../../B1-architecture.md)。
