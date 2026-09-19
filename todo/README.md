# Todo · 清单任务

复刻 Todoist 的清单任务应用：多项目（清单）分隔、任务优先级 P1–P4、截止日期、一级子任务，以及标志性的**今日视图**与顶部**快速添加框**。

## 技术栈

- 后端：Express + better-sqlite3（数据持久化）+ TypeScript
- 前端：React + Vite + MUI + Tailwind CSS

## 功能

- 项目（清单）CRUD：切换不同清单、重命名、删除
- 任务 CRUD：标题 / 描述 / 优先级 P1–P4 / 截止日期 / 完成态
- 子任务：自引用 `parent_id`，一级嵌套
- 今日视图：按截止/优先级聚合未完成任务
- 顶部快速添加框（回车即建）

## 目录结构

```
todo/
├── client/   # 前端（React + MUI + Tailwind）
└── server/   # 后端（Express + better-sqlite3）
```

## 运行

### 后端

```bash
cd todo/server
npm install
npm run dev      # 开发模式（tsx watch）
# 或
npm run build && npm start
```

- 端口由启动器通过 `PORT` 环境变量注入，默认回退 `4222`
- 数据库文件位于 `server/data/app.db`（运行时生成）

### 前端

```bash
cd todo/client
npm install
npm run dev      # 开发服务器，默认 http://localhost:5202
# 或
npm run build    # 产物输出到 dist/
```

- 通过 `VITE_API_BASE` 指定后端地址（默认 `http://localhost:4222/api`）

## 测试

```bash
cd todo/server
npm test         # vitest run
```

## API 速览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/projects` | 项目列表 |
| POST | `/api/projects` | 新建项目 |
| PATCH | `/api/projects/:id` | 更新项目 |
| DELETE | `/api/projects/:id` | 删除项目 |
| GET | `/api/projects/:id/tasks` | 项目任务列表（含一级子任务） |
| POST | `/api/projects/:id/tasks` | 新建任务（可带 `parentId`） |
| PATCH | `/api/tasks/:id` | 更新任务 |
| DELETE | `/api/tasks/:id` | 删除任务 |
| GET | `/api/today` | 今日视图聚合 |
| GET | `/api/health` | 健康检查 |
