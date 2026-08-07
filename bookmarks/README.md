# 书签收藏（Bookmarks）

一个真实可用的书签收藏管理 App：收藏链接、分类管理、全文搜索、列表 / 网格视图切换、favicon 自动抓取，数据持久化到后端 SQLite。

## 功能

- 书签 CRUD：网址 / 标题 / 描述 / 分类
- URL 自动归一化去重（忽略 www / http / https / 默认端口 / 结尾斜杠）
- 分类 CRUD + 按分类筛选（含未分类）+ 关键词搜索（标题 / 网址 / 描述）
- 列表 / 网格视图切换，视图偏好本地持久化
- favicon 自动抓取（`https://<domain>/favicon.ico`），失败回退首字母图标
- 点击书签卡片在新标签页打开

## 技术栈

- 前端：Vite + React 18 + TypeScript(strict) + MUI 5 + Tailwind 3
- 后端：Express 4 + TypeScript(strict) + better-sqlite3
- 统一响应信封 `{ code, message, data }`；`/api` 前缀

## 运行

```bash
# 后端（端口 4217，默认 CORS 指向 http://localhost:5197）
cd server
npm install
npm run dev

# 前端（端口 5197）
cd client
npm install
npm run dev
```

或从仓库根目录用统一脚本（端口以根目录 `apps.ports.json` 为准）：

```bash
node scripts/start-app.mjs bookmarks
node scripts/stop-app.mjs bookmarks
```

## 验证

```bash
cd client && npm test && npm run build   # 客户端单测 + 构建
cd server && npm test && npm run build   # 服务端单测 + 构建
npm test                                  # 仓库级统一验收
```
