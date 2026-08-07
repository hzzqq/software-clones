# App 目录（自动生成 · 请勿手改）

> 本文件由 `scripts/gen-catalog.mjs` 从 `playwright.config.ts` 与 `server/.env.example` 派生。
> 若新增/重命名 App，请修改事实来源后运行 `node scripts/gen-catalog.mjs` 重新生成。
> 校验：`node scripts/check-consistency.mjs`

共 30 个克隆 App。

| App | 形态 | E2E 前端端口 | 后端端口 | 前端目录 | 后端目录 |
|---|---|---|---|---|---|
| `apiclient` | 全栈（前端 + 后端） | 5181 | 4109 | `apiclient/client` | `apiclient/server` |
| `bookmarks` | 全栈（前端 + 后端） | 5197 | 4217 | `bookmarks/client` | `bookmarks/server` |
| `canvas` | 全栈（前端 + 后端） | 5203 | 4101 | `canvas/client` | `canvas/server` |
| `chatroom` | 全栈（前端 + 后端） | 5200 | 4220 | `chatroom/client` | `chatroom/server` |
| `excalidraw` | 全栈（前端 + 后端） | 5183 | 4111 | `excalidraw/client` | `excalidraw/server` |
| `filemanager` | 全栈（前端 + 后端） | 5207 | 4101 | `filemanager/client` | `filemanager/server` |
| `fileshare` | 全栈（前端 + 后端） | 5199 | 4219 | `fileshare/client` | `fileshare/server` |
| `finance` | 全栈（前端 + 后端） | 5208 | 4101 | `finance/client` | `finance/server` |
| `gallery` | 全栈（前端 + 后端） | 5205 | 4101 | `gallery/client` | `gallery/server` |
| `glance` | 全栈（前端 + 后端） | 5187 | 4103 | `glance/client` | `glance/server` |
| `gridbase` | 全栈（前端 + 后端） | 5206 | 4101 | `gridbase/client` | `gridbase/server` |
| `habit` | 全栈（前端 + 后端） | 5196 | 4216 | `habit/client` | `habit/server` |
| `it-tools` | 全栈（前端 + 后端） | 5185 | 4101 | `it-tools/client` | `it-tools/server` |
| `kanban` | 全栈（前端 + 后端） | 5186 | 4102 | `kanban/client` | `kanban/server` |
| `keep` | 全栈（前端 + 后端） | 5201 | 4101 | `keep/client` | `keep/server` |
| `kener` | 全栈（前端 + 后端） | 5188 | 4104 | `kener/client` | `kener/server` |
| `knowledge` | 全栈（前端 + 后端） | 5204 | 4101 | `knowledge/client` | `knowledge/server` |
| `lofi` | 全栈（前端 + 后端） | 5190 | 4106 | `lofi/client` | `lofi/server` |
| `markdown` | 全栈（前端 + 后端） | 5180 | 4108 | `markdown/client` | `markdown/server` |
| `memos` | 全栈（前端 + 后端） | 5189 | 4105 | `memos/client` | `memos/server` |
| `nonio` | 全栈（前端 + 后端） | 5191 | 4107 | `nonio/client` | `nonio/server` |
| `pastebin` | 全栈（前端 + 后端） | 5209 | 4101 | `pastebin/client` | `pastebin/server` |
| `photopea` | 全栈（前端 + 后端） | 5184 | 4112 | `photopea/client` | `photopea/server` |
| `pomodoro` | 全栈（前端 + 后端） | 5210 | 4101 | `pomodoro/client` | `pomodoro/server` |
| `rssreader` | 全栈（前端 + 后端） | 5194 | 4214 | `rssreader/client` | `rssreader/server` |
| `shlink` | 全栈（前端 + 后端） | 5193 | 4213 | `shlink/client` | `shlink/server` |
| `snippets` | 全栈（前端 + 后端） | 5198 | 4218 | `snippets/client` | `snippets/server` |
| `todo` | 全栈（前端 + 后端） | 5202 | 4101 | `todo/client` | `todo/server` |
| `tvtime` | 全栈（前端 + 后端） | 5182 | 4110 | `tvtime/client` | `tvtime/server` |
| `vault` | 全栈（前端 + 后端） | 5195 | 4215 | `vault/client` | `vault/server` |

## 约定
- 前端：Vite + React 18 + TypeScript(strict) + MUI 5 + Tailwind 3
- 后端：Express 4 + TypeScript(strict) + better-sqlite3 + dotenv + cors
- 统一响应信封 `{ code, message, data }`（code:0 成功）；JSON `camelCase` ↔ DB `snake_case`；`/api` 前缀。
