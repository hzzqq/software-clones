# software-clones · B1 批次

三个全栈克隆 App 的单体仓库（B1）。每个 App 的 `client/` 与 `server/` 各自独立 `package.json`，互不耦合。

| App | 说明 | 前端(dev) | 后端 | VITE_API_BASE |
|---|---|---|---|---|
| `it-tools` | 开发者工具箱（30+ 工具，计算纯前端，收藏/历史/设置可选后端） | 5173 | 4101 | http://localhost:4101/api |
| `kanban` | 任务/看板（Board→List→Card→Tag，拖拽排序持久化） | 5174 | 4102 | http://localhost:4102/api |
| `glance` | 信息聚合仪表盘（RSS/天气/书签/状态/时钟，后端代理 + YAML 导入导出） | 5175 | 4103 | http://localhost:4103/api |

## 技术栈

- 前端：`Vite + React 18 + TypeScript(strict) + MUI 5 + Tailwind 3`
- 后端：`Express 4 + TypeScript(strict) + better-sqlite3 + dotenv + cors`
- 共享约定：响应信封 `{ code, message, data }`（`code:0` 成功，非零见各 App 错误码表，50200=代理失败）；JSON `camelCase` ↔ DB `snake_case`；`/api` 前缀；前端经 `VITE_API_BASE` 注入基址，不写死。

## 运行

每个 App 需分别安装依赖并启动前后端（以 `it-tools` 为例，其余替换目录即可）：

```bash
# 前端
cd it-tools/client && npm install && npm run dev      # http://localhost:5173

# 后端
cd it-tools/server && npm install && npm run dev      # http://localhost:4101
```

后端默认从 `.env`（见 `.env.example`）读取 `PORT` / `CORS_ORIGIN` / `DB_PATH`，首次启动自动建表（读 `src/schema.sql`），SQLite 落在 `<app>/server/data/app.db`。

> 沙箱若无法联网安装依赖或编译 `better-sqlite3` 原生模块，请在本机执行 `npm install` 后运行；代码已通过人工一致性审查。

## 目录

```
software-clones/
├── shared/            # 前后端脚手架模板（复制起点，非运行时依赖）
├── it-tools/          # App1 开发者工具箱
├── kanban/            # App2 任务/看板
└── glance/            # App3 信息聚合仪表盘
```
