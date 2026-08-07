# habit

习惯养成：打卡 + 连续天数（streak）+ 等级 XP 的游戏化习惯管理。

## 技术栈

- 前端：Vite + React 18 + TypeScript(strict) + MUI 5 + Tailwind 3
- 后端：Express 4 + TypeScript(strict) + better-sqlite3 + dotenv + cors

## 运行

```bash
# 前端（端口 5196）
cd habit/client && npm install && npm run dev

# 后端（端口 4216）
cd habit/server && npm install && npm run dev
```

后端默认从 `.env`（见 `server/.env.example`）读取 `PORT` / `CORS_ORIGIN` / `DB_PATH`，
首次启动自动建表（读 `src/schema.sql`），SQLite 落在 `habit/server/data/app.db`。

## 数据模型

- `habit`：习惯（名称 / emoji 图标 / 频率 daily|weekly / 每周或每日目标次数）
- `checkin`：打卡记录，`(habit_id, date)` 唯一，防止同一天重复打卡

每次打卡 +10 XP；等级阈值 = 50 × (L−1) × L（Lv.2 需 100 XP，Lv.3 需 300 …）。

## 目录结构

- `client/` — React + Vite 前端（`npm run dev` 启动，`npm run test` 跑单元用例）
- `server/` — Express 后端（REST 接口前缀 `/api`，SQLite 持久化）

> 共享约定（响应信封、`camelCase`↔`snake_case`、`VITE_API_BASE` 注入等）见仓库根
> [README.md](../../README.md) 与 [B1-architecture.md](../../B1-architecture.md)。

## 验证

```bash
cd habit/client && npx tsc --noEmit && npm run build && npm test
cd habit/server && npx tsc --noEmit && npm test
```

> 单独验证本 App：`npm run test:app habit`（见仓库根 CONTRIBUTING.md）。
