# 贡献指南（software-clones）

本仓库是多个全栈克隆 App 的单体仓库（monorepo）。每个 App 形如 `app/<name>/`，含独立的
`client/`（Vite + React + TS）与 `server/`（Express + better-sqlite3）。

## 本地验收

无需 `npm install` 任何 App 依赖即可运行仓库级校验（纯 Node 内置模块）：

```bash
npm run verify          # 运行 scripts/verify-all.mjs（一致性校验 + 规则单元测试 + 目录新鲜度）
npm run test:rules      # 仅运行 scripts/check-consistency.test.mjs（规则纯函数单测）
npm run fix             # 自动修复可自愈项（当前：重新生成过期的 docs/APP_CATALOG.md）
node scripts/verify-all.mjs   # 直接运行统一验收入口
node scripts/check-consistency.mjs   # 单独运行一致性校验器本身
node scripts/check-consistency.mjs --fix   # 校验并尝试自动修复
```

该命令会校验：

- 每个全栈 App 都在 `README.md` 中被提及（文档漂移防护）；
- 每个 App 在 `e2e/<app>/` 下拥有冒烟目录，且至少包含一份 `*.spec.ts` 冒烟用例；
- 每个 App 的 `server` 存在 `.env.example`，且含必需配置项 `PORT` 与 `CORS_ORIGIN`；
- 每个 App 的 `client/package.json` 都声明了 `test` 脚本**且真正包含单元测试用例文件**（杜绝空心回归网）；
- 每个 App 具备可构建的脚手架（client 需 `tsconfig.json` + vite 配置，server 需 `tsconfig.json`）；
- 每个 App 的 `client` 都将其 `ErrorBoundary` 真正接入渲染树（仅存在文件未接线无效）；
- 每个 App 都自带 `<app>/README.md` 上手说明；
- 每个 App 都登记在 `.github/workflows/e2e.yml` 的 CI 矩阵与 `playwright.config.ts` 的 `APPS`（精确匹配、无重复端口/名称，禁止幽灵注册）；
- `shared/` 下的脚手架模板（`backend-template` / `frontend-template`）关键文件完整；
- 仓库内**全部** Markdown 的内部相对链接均有效（链接腐化防护，递归扫描）；
- `docs/APP_CATALOG.md` 与事实来源严格一致（新鲜度，可用 `--fix` 自动修复）。

CI 的 `consistency` 作业会自动运行 `node scripts/verify-all.mjs`，PR 阶段即可拦截漂移与规则回归。

## 重新生成 App 目录

`docs/APP_CATALOG.md` 是**自动生成**的，事实来源为 `playwright.config.ts` 的 `APPS`
与每个 App 的 `server/.env.example` 的 `PORT`。改动事实来源后请重新生成：

```bash
node scripts/gen-catalog.mjs   # 或 npm run catalog
node scripts/check-consistency.mjs --fix   # 等价：校验并自动重新生成过期目录
```

## 新增一个 App

1. 创建 `app/<name>/client` 与 `app/<name>/server`，各自带 `package.json`。
2. `server` 下提供 `.env.example`（含 `PORT` / `CORS_ORIGIN` / `DB_PATH`）。
3. `client/package.json` 的 `scripts` 至少声明一个 `test` 命令（如 `vitest run`）。
4. 在 `playwright.config.ts` 的 `APPS` 增加一项（含唯一 `port`）。
5. 在 `.github/workflows/e2e.yml` 的 `matrix.app` 增加该 App。
6. 在 `e2e/<name>/` 放置至少一个 `*.spec.ts` 冒烟用例（断言应用成功挂载）。
7. 在 `README.md` 的「全部克隆 App」列表与 `docs/APP_CATALOG.md`（重新生成）补充该 App。
8. 运行 `npm run verify` 确认全绿后再提交。

## 代码约定

- 前端：Vite + React 18 + TypeScript(strict) + MUI 5 + Tailwind 3。
- 后端：Express 4 + TypeScript(strict) + better-sqlite3 + dotenv + cors。
- 统一响应信封 `{ code, message, data }`（`code:0` 成功）；JSON `camelCase` ↔ DB `snake_case`；`/api` 前缀。
- 根目录 `.editorconfig` 锁定 LF 换行与 2 空格缩进，请保持。
