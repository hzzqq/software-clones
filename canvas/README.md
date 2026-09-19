# 无限画布（canvas）

克隆热门软件 **Obsidian Canvas** 的网页版：在可平移缩放的画布上，用节点和连线自由组织想法。

## 功能

- **画布管理**：创建 / 重命名 / 删除画布。
- **节点**：`note`（便签）/ `group`（分组）/ `image`（图片）三种类型，可拖拽移动、缩放、改色。
- **连线**：在两个节点之间建立连接（带连接点方位 `from_side` / `to_side`）。
- **画布交互**：滚轮缩放、拖拽空白处平移、拖拽移动节点。
- **图片节点**：复用二进制上传，落盘后返回可访问 URL。

## 技术栈

- 前端：Vite + React 18 + TypeScript + MUI 5 + Tailwind 3
- 后端：Express 4 + TypeScript + better-sqlite3

## 运行

```bash
# 根目录一键启动全部 App
npm run dev:all

# 或单独运行
cd canvas/client && npm install && npm run dev
cd canvas/server && npm install && npm run dev
```

后端端口由启动器注入（`apps.ports.json` 中 canvas 为 `4223` / 前端 `5203`）。

## API 速览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/canvases` | 画布列表 |
| POST | `/api/canvases` | 新建画布 |
| GET | `/api/canvases/:id` | 画布详情（含节点与连线） |
| DELETE | `/api/canvases/:id` | 删除画布 |
| POST | `/api/canvases/:id/nodes` | 新建节点 |
| PATCH | `/api/nodes/:id` | 更新节点（位置/尺寸/内容） |
| DELETE | `/api/nodes/:id` | 删除节点 |
| POST | `/api/canvases/:id/edges` | 新建连线 |
| DELETE | `/api/edges/:id` | 删除连线 |
