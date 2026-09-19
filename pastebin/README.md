# 文本 / 代码粘贴板（pastebin）

克隆热门服务 **Pastebin** 的轻量网页版：把文本或代码生成公开短链，支持语法高亮与过期。

## 功能

- **创建粘贴**：填写标题 / 内容 / 语言 / 可见性 / 过期时间，生成 6 位短码。
- **公开短链**：通过 `/:code` 公开访问与查看。
- **过期**：可设置分钟级过期，过期后访问返回 404。
- **删除**：按短码删除。
- **查看**：代码以等宽字体块展示（语法高亮为可选增强，离线默认纯文本）。

## 技术栈

- 前端：Vite + React 18 + TypeScript + MUI 5 + Tailwind 3
- 后端：Express 4 + TypeScript + better-sqlite3

## 运行

```bash
npm run dev:all
# 或单独
cd pastebin/client && npm install && npm run dev
cd pastebin/server && npm install && npm run dev
```

后端端口由启动器注入（`apps.ports.json` 中 pastebin 为 `4229` / 前端 `5209`）。

## API 速览

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/pastes` | 创建粘贴，返回短码与 `url` |
| GET | `/api/pastes` | 公开粘贴列表 |
| GET | `/api/pastes/:code` | 查看（过期 404） |
| DELETE | `/api/pastes/:code` | 删除 |

## 验证（本地验收红线）

```bash
# 前端单测（vitest）
cd pastebin/client && npm install && npm test
# 后端单测（node --test，零依赖）
cd pastebin/server && npm install && npm test
```

仓库级统一验收：`npm test`（自动编排全部 App 的单测）。
