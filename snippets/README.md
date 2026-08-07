# 代码片段（Snippets）

一个真实可用的代码片段管理 App：收藏常用代码、按语言 / 标签筛选、搜索、语法高亮、一键复制，数据持久化到后端 SQLite。

## 功能

- 片段 CRUD：标题 / 语言 / 代码内容 / 标签
- 支持 JavaScript、TypeScript、Python、Java、Go、Bash、SQL、JSON、HTML、CSS、纯文本
- **零依赖手写语法高亮器**（正则分词：注释 / 字符串 / 数字 / 关键字 / HTML 标签），先转义再高亮，防 XSS
- 复制代码按钮（剪贴板 API + execCommand 回退）
- 按语言筛选 + 按标签筛选 + 关键词搜索（标题 / 代码内容）

## 技术栈

- 前端：Vite + React 18 + TypeScript(strict) + MUI 5 + Tailwind 3
- 后端：Express 4 + TypeScript(strict) + better-sqlite3
- 统一响应信封 `{ code, message, data }`；`/api` 前缀

## 运行

```bash
# 后端（端口 4218，默认 CORS 指向 http://localhost:5198）
cd server
npm install
npm run dev

# 前端（端口 5198）
cd client
npm install
npm run dev
```

或从仓库根目录用统一脚本（端口以根目录 `apps.ports.json` 为准）：

```bash
node scripts/start-app.mjs snippets
node scripts/stop-app.mjs snippets
```

## 验证

```bash
cd client && npm test && npm run build   # 客户端单测 + 构建
cd server && npm test && npm run build   # 服务端单测 + 构建
npm test                                  # 仓库级统一验收
```
