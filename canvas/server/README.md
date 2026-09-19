# 无限画布 · Canvas

复刻 Obsidian Canvas 的**无限画布**：节点（note / group / image）+ 自由连线（带连接点方位）。
支持画布平移/缩放、节点拖拽、框选删除、图片节点上传。数据持久化于后端 SQLite。

## 目录结构

- `server/` —— Express + better-sqlite3 后端（端口 `PORT` 注入，默认 `4223`）
- `client/` —— Vite + React + MUI 前端（端口由启动器注入，默认 `5203`）

## 后端运行

```bash
cd canvas/server
npm install
npm run dev          # tsx watch
npm run build && npm start
```

## 前端运行

```bash
cd canvas/client
npm install
npm run dev
```

## 测试（服务端 vitest）

```bash
cd canvas/server
npm test
```

## 交互说明（前端）

- 滚轮缩放，拖拽空白处平移画布
- 节点绝对定位卡片，拖拽更新坐标
- 工具栏：加节点（note/group）、连线模式（点 A 再点 B）、删除选中、上传图片
- 在空白处框选多个节点后可批量删除

## API 摘要

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/canvases` | 画布列表 |
| POST | `/api/canvases` | 新建画布 `{ name? }` |
| GET | `/api/canvases/:id` | 画布 + 节点 + 连线 |
| PATCH | `/api/canvases/:id` | 重命名 |
| DELETE | `/api/canvases/:id` | 删除 |
| POST | `/api/canvases/:id/nodes` | 新建节点 |
| PATCH | `/api/nodes/:id` | 更新节点坐标/内容 |
| DELETE | `/api/nodes/:id` | 删除节点 |
| DELETE | `/api/nodes` | 批量删除 `{ ids:[] }` |
| POST | `/api/canvases/:id/edges` | 新建连线 |
| PATCH | `/api/edges/:id` | 改连接点方位 |
| DELETE | `/api/edges/:id` | 删除连线 |
| POST | `/api/uploads` | 图片上传（二进制 + `X-File-Name`） |
