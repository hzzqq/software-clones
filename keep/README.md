# Keep · 极简便签

复刻 Google Keep 的极简便签应用：彩色便签网格、置顶、归档、回收站、标签多对多筛选，以及标志性的**勾选清单（Checklist）**。

## 技术栈

- 后端：Express + better-sqlite3（数据持久化）+ TypeScript
- 前端：React + Vite + MUI + Tailwind CSS

## 功能

- 便签 CRUD：标题 / 正文 / 颜色 / 置顶 / 归档 / 回收站
- 标签多对多，支持按标签、按颜色筛选
- 便签内勾选清单（Checklist）
- 彩色网格卡片 + 一键置顶（置顶排前）

## 目录结构

```
keep/
├── client/   # 前端（React + MUI + Tailwind）
└── server/   # 后端（Express + better-sqlite3）
```

## 运行

### 后端

```bash
cd keep/server
npm install
npm run dev      # 开发模式（tsx watch）
# 或
npm run build && npm start
```

- 端口由启动器通过 `PORT` 环境变量注入，默认回退 `4221`
- 数据库文件位于 `server/data/app.db`（运行时生成）

### 前端

```bash
cd keep/client
npm install
npm run dev      # 开发服务器，默认 http://localhost:5201
# 或
npm run build    # 产物输出到 dist/
```

- 通过 `VITE_API_BASE` 指定后端地址（默认 `http://localhost:4221/api`）

## 测试

```bash
cd keep/server
npm test         # vitest run
```

## API 速览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/notes` | 便签列表（支持 `view`/`label`/`color`/`q` 筛选） |
| POST | `/api/notes` | 新建便签 |
| GET | `/api/notes/:id` | 便签详情 |
| PATCH | `/api/notes/:id` | 更新便签 |
| DELETE | `/api/notes/:id` | 删除便签 |
| GET | `/api/labels` | 标签列表（含使用次数） |
| GET | `/api/colors` | 已使用的颜色列表 |
| GET | `/api/health` | 健康检查 |
