# 表格数据库（gridbase）

克隆热门软件 **Airtable** 的网页版：用可配置字段类型的表格以网格视图管理结构化数据。

## 功能

- **表（Table）**：创建 / 重命名 / 删除数据表。
- **字段（Field）**：动态字段，支持类型 `text` / `number` / `select` / `checkbox` / `date` / `url`；`select` 选项以 JSON 存储。
- **行与单元格**：EAV（实体-属性-值）模型存储，避免运行时 `ALTER TABLE`；网格视图可编辑单元格。
- **网格视图**：按字段类型渲染不同编辑器（文本 / 数字 / 下拉 / 勾选 / 日期 / 链接）。

## 技术栈

- 前端：Vite + React 18 + TypeScript + MUI 5 + Tailwind 3
- 后端：Express 4 + TypeScript + better-sqlite3

## 运行

```bash
npm run dev:all
# 或单独
cd gridbase/client && npm install && npm run dev
cd gridbase/server && npm install && npm run dev
```

后端端口由启动器注入（`apps.ports.json` 中 gridbase 为 `4226` / 前端 `5206`）。

## API 速览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/tables` | 表列表 |
| POST | `/api/tables` | 新建表 |
| GET | `/api/tables/:id` | 表详情（含字段与行） |
| DELETE | `/api/tables/:id` | 删除表 |
| POST | `/api/tables/:id/fields` | 新增字段 |
| PATCH | `/api/fields/:id` | 更新字段 |
| POST | `/api/tables/:id/rows` | 新增行 |
| PATCH | `/api/rows/:id/cells` | 更新单元格 |
