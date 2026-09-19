# 双链大纲笔记（knowledge）

克隆热门软件 **Logseq** 的网页版：用大纲块和双向链接构建可钻取的个人知识网络。

## 功能

- **页面（Page）**：创建 / 重命名 / 删除页面。
- **大纲块（Block）**：页面内树状嵌套块（`parent_id` 自引用），可折叠缩进。
- **双向链接**：在块内容中输入 `[[页面名]]` 或 `((块id))` 建立引用，保存时自动解析写入关系表。
- **反链面板（Backlinks）**：显示哪些块链接到当前页面 / 块。
- **搜索**：按页面名或内容全文检索。

## 技术栈

- 前端：Vite + React 18 + TypeScript + MUI 5 + Tailwind 3
- 后端：Express 4 + TypeScript + better-sqlite3

## 运行

```bash
npm run dev:all
# 或单独
cd knowledge/client && npm install && npm run dev
cd knowledge/server && npm install && npm run dev
```

后端端口由启动器注入（`apps.ports.json` 中 knowledge 为 `4224` / 前端 `5204`）。

## API 速览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/pages` | 页面列表 |
| POST | `/api/pages` | 新建页面 |
| GET | `/api/pages/:id` | 页面详情（含块树） |
| DELETE | `/api/pages/:id` | 删除页面 |
| POST | `/api/pages/:id/blocks` | 新建块 |
| PATCH | `/api/blocks/:id` | 更新块内容 / 位置 |
| DELETE | `/api/blocks/:id` | 删除块 |
| GET | `/api/backlinks` | 反链查询（?target=page:ID 或 block:ID） |

## 验证（本地验收红线）

```bash
# 前端单测（vitest）
cd knowledge/client && npm install && npm test
# 后端单测（node --test，零依赖）
cd knowledge/server && npm install && npm test
```

仓库级统一验收：`npm test`（自动编排全部 App 的单测）。
