# vault

密码保险库：密码条目加密存储（AES-256-GCM），支持搜索、分类筛选、随机密码生成、一键复制。

## 技术栈

- 前端：Vite + React 18 + TypeScript(strict) + MUI 5 + Tailwind 3
- 后端：Express 4 + TypeScript(strict) + better-sqlite3 + dotenv + cors
- 加密：node:crypto（AES-256-GCM，零额外依赖）

## 运行

```bash
# 前端（端口 5195）
cd vault/client && npm install && npm run dev

# 后端（端口 4215）
cd vault/server && npm install && npm run dev
```

后端默认从 `.env`（见 `server/.env.example`）读取 `PORT` / `CORS_ORIGIN` / `DB_PATH` / `SECRET`，
首次启动自动建表（读 `src/schema.sql`），SQLite 落在 `vault/server/data/app.db`。

## 加密说明

- 密码字段以 AES-256-GCM 加密后落库，数据库内不存在明文密码。
- 密钥来自 `SECRET` 环境变量（SHA-256 派生）；未配置时首次启动自动生成随机密钥并写入 `data/secret.key`。
- 密文格式 `iv.tag.ciphertext`，带 GCM 认证标签，篡改 / 换密钥都会解密失败。

## 目录结构

- `client/` — React + Vite 前端（`npm run dev` 启动，`npm run test` 跑单元用例）
- `server/` — Express 后端（REST 接口前缀 `/api`，SQLite 持久化）

> 共享约定（响应信封、`camelCase`↔`snake_case`、`VITE_API_BASE` 注入等）见仓库根
> [README.md](../../README.md) 与 [B1-architecture.md](../../B1-architecture.md)。

## 验证

```bash
cd vault/client && npx tsc --noEmit && npm run build && npm test
cd vault/server && npx tsc --noEmit && npm test
```

> 单独验证本 App：`npm run test:app vault`（见仓库根 CONTRIBUTING.md）。
