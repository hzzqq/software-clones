# 扩张计划：新增 10 个 App（20 → 30）

> 目标：从现有 20 个克隆 App 扩到 30 个。
> 来源：`top100_data.json` 中 feasibility 为 ✅ / 🟡 的条目（Web 友好、纯前端+本地后端可实现）。
> 约束：与现有 20 个**不重叠**（不重复 看板/Trello、习惯/Habitica、图像编辑/Photopea、API 工具/Postman、笔记/Memos/Markdown、聊天/社区 等既有品类）；不碰桌面原生 / 需外部大模型 API / 需第三方账号的软件。
> 定位：**复刻/仿制**（自己重写核心玩法，抓高频场景，不要求全量）。

---

## 1. 锁定清单

| # | 目录名 | 复刻对象 | feasibility | 一句话定位 | 建议后端端口 / 前端端口 |
|---|--------|----------|-------------|------------|--------------------------|
| 1 | `keep` | Google Keep | ✅ | 极简便签（颜色/置顶/标签/清单），快速捕捉 | 4221 / 5201 |
| 2 | `todo` | Todoist | ✅ | 清单任务（项目/优先级/截止/子任务） | 4222 / 5202 |
| 3 | `canvas` | Obsidian Canvas | ✅ | 无限画布（节点+连线+便签，可视化组织） | 4223 / 5203 |
| 4 | `knowledge` | Logseq | ✅ | 双链大纲笔记（块/大纲/反链） | 4224 / 5204 |
| 5 | `gallery` | Immich | 🟡 | 自托管相册（上传/相册集/标签/预览） | 4225 / 5205 |
| 6 | `gridbase` | Airtable | 🟡 | 表格型数据库（表/字段类型/网格视图） | 4226 / 5206 |
| 7 | `filemanager` | Files | 🟡 | 文件管理器（服务端目录树浏览/预览/分享） | 4227 / 5207 |
| 8 | `finance` | OpenBB | 🟡 | 金融终端（行情面板/自选/简表，含种子数据） | 4228 / 5208 |
| 9 | `pastebin` | Pastebin | 工具类* | 文本/代码粘贴板（公开短链/语法高亮/过期） | 4229 / 5209 |
| 10 | `pomodoro` | 番茄钟 | 工具类* | 专注计时（计时/任务/统计） | 4230 / 5210 |

\* `pastebin`、`pomodoro` 为团队负责人指定的「工具类」补充项，不在 top100 清单内，但满足 Web 友好 + 与现有不重叠，已预批准。其余 8 项均来自 `top100_data.json` 的 ✅/🟡 条目。

### 审计说明（不重叠 & 可行性）
- **与既有笔记区分**：`keep`（极简彩色便签/清单，快速捕捉）、`knowledge`（大纲块 + 双向链接）、`canvas`（节点图可视化）三者虽沾「笔记」边，但核心玩法与现有 `memos`（轻量长文）/ `markdown`（编辑器）明显不同，按不同 UX 子品类处理。
- **与既有品类区分**：`todo` vs `kanban`(看板)/`habit`(习惯)；`canvas` vs `excalidraw`(手绘白板)；`gallery` vs `fileshare`(通用文件分享短链)；`pastebin` vs `snippets`(私有片段，无过期/无公开短链)；`filemanager` vs `fileshare`(上传分享)。均不重叠。
- **🟡 项风险与对策**：`gallery`(图片落盘/EXIF)、`gridbase`(动态表结构/EAV)、`filemanager`(路径穿越安全)、`finance`(行情数据源) 见各自「范围文档」的对策。

---

## 2. 每个 App 的范围文档

> 约定：表名 `snake_case`，`id INTEGER PRIMARY KEY AUTOINCREMENT`，时间用 `TEXT`（ISO8601，`datetime('now')`）；JSON 信封 `{ code, message, data }`，`/api` 前缀；复用 `shared/backend-template` + `shared/frontend-template`。

---

### 2.1 keep — Google Keep 极简便签

- **产品目标**：让用户用「颜色 + 标签 + 置顶」快速捕捉与分拣零碎信息。
- **MVP 核心功能**：
  - CRUD 便签（标题 + 正文 + 颜色 + 置顶 + 归档/回收站）。
  - 标签（多对多），按标签/颜色筛选。
  - 勾选清单（便签内 checklist 项，P1）。
  - 标志性特色：**彩色网格 + 一键置顶 + 拖拽排序**。
- **数据模型草图**：
```sql
CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'default',
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  is_trash INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE note_labels ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE );
CREATE TABLE note_label_map ( note_id INTEGER NOT NULL, label_id INTEGER NOT NULL, PRIMARY KEY (note_id, label_id) );
-- P1: CREATE TABLE note_items ( id INTEGER PRIMARY KEY AUTOINCREMENT, note_id INTEGER NOT NULL, text TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0 );
```
- **建议复用**：`snippets` 的 CRUD + 标签模式（`snippets`/`tags`/`snippet_tags` + `tags.ts` 路由 + `snippetRepo`）。颜色/置顶是 `snippets` 没有的字段，前端用 MUI `Grid` + `Chip` 实现彩色便签卡。

---

### 2.2 todo — Todoist 清单任务

- **产品目标**：以「项目 + 优先级 + 截止 + 子任务」管理可执行的任务清单。
- **MVP 核心功能**：
  - 项目（Project）CRUD，切换不同清单。
  - 任务 CRUD：标题、描述、优先级(P1–P4)、截止日期、完成态。
  - 子任务（任务自引用 parent_id，一级即可）。
  - 标志性特色：**今日视图**（按截止/优先级聚合）+ 快速添加。
- **数据模型草图**：
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'default',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 1,
  due_date TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```
- **建议复用**：`snippets` 的 CRUD 模式；自引用 `parent_id` 实现子任务（参考 `chatroom` 的 `messages` 自引用用法）。优先级/截止为新增字段，前端用 MUI `List` + `MenuItem` 优先级选择器。

---

### 2.3 canvas — Obsidian Canvas 无限画布

- **产品目标**：在一块可无限平移/缩放的画布上，用「节点 + 连线」可视化组织想法。
- **MVP 核心功能**：
  - 画布 CRUD；节点 CRUD（便签文本 / 分组框 / 图片节点）。
  - 连线（节点 A → 节点 B，带连接点方位）。
  - 画布平移/缩放、拖拽移动节点、框选删除。
  - 标志性特色：**节点 + 连线**的自由拓扑（区别于 excalidraw 手绘）。
- **数据模型草图**：
```sql
CREATE TABLE canvases ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT 'Untitled', created_at TEXT NOT NULL, updated_at TEXT NOT NULL );
CREATE TABLE canvas_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canvas_id INTEGER NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,            -- 'note' | 'group' | 'image'
  x REAL NOT NULL, y REAL NOT NULL, w REAL NOT NULL, h REAL NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  color TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE canvas_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canvas_id INTEGER NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  from_id INTEGER NOT NULL REFERENCES canvas_nodes(id) ON DELETE CASCADE,
  to_id INTEGER NOT NULL REFERENCES canvas_nodes(id) ON DELETE CASCADE,
  from_side TEXT NOT NULL DEFAULT 'right',
  to_side TEXT NOT NULL DEFAULT 'left'
);
```
- **建议复用**：`snippets` 的文档级 CRUD；图片节点复用 `fileshare` 的二进制上传（`express.raw` + `X-File-Name` 头，零 multer）。前端画布交互（平移/缩放/拖拽）参考 `excalidraw` 的 canvas 交互，但数据模型是「节点+边」而非自由笔迹。

---

### 2.4 knowledge — Logseq 双链大纲笔记

- **产品目标**：用「大纲块 + 双向链接」构建可钻取的知识网络。
- **MVP 核心功能**：
  - 页面（Page）CRUD；页面内大纲块（block）树（自引用 parent_id）。
  - 输入 `[[页面名]]` / `((块id))` 建立引用。
  - 反链面板（显示「哪些块链接到当前页/块」）——**标志性特色**。
  - 全文/页面内搜索（P1）。
- **数据模型草图**：
```sql
CREATE TABLE pages ( id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL );
CREATE TABLE blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES blocks(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE block_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_block_id INTEGER NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  to_page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
  to_block_id INTEGER REFERENCES blocks(id) ON DELETE CASCADE
);
```
- **建议复用**：`snippets` 的 CRUD + 标签模式（这里换成 pages/blocks）；反链通过解析 block.content 中的 `[[...]]` 写入 `block_links`（类似 `rssreader` 解析 XML 的字符串处理）。前端大纲用可折叠 `Tree`/缩进列表。

---

### 2.5 gallery — Immich 自托管相册

- **产品目标**：自托管地存储、归类与浏览个人照片。
- **MVP 核心功能**：
  - 图片上传（多文件），生成短码、落盘、记录元信息。
  - 相册集（Album）CRUD，图片加入/移出相册（多对多）。
  - 标签、按时间/相册网格浏览、灯箱预览。
  - 标志性特色：**时间线网格 + 相册分组**。
- **数据模型草图**：
```sql
CREATE TABLE assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,            -- 复用 fileshare code.ts 短码
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER, height INTEGER,
  taken_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE albums ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at TEXT NOT NULL );
CREATE TABLE album_assets ( album_id INTEGER NOT NULL, asset_id INTEGER NOT NULL, PRIMARY KEY (album_id, asset_id) );
CREATE TABLE asset_tags ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE );
CREATE TABLE asset_tag_map ( asset_id INTEGER NOT NULL, tag_id INTEGER NOT NULL, PRIMARY KEY (asset_id, tag_id) );
```
- **🟡 对策**：图片用 `fileshare` 的 `express.raw` 上传 + 磁盘存储 + 短码；缩略图可由前端 `<img>` 直接缩放，MVP 不强制服务端缩略图。EXIF 解析（taken_at）用轻量库或留空，列为 P1。
- **建议复用**：`fileshare` 的二进制上传 + 短码 + 磁盘落盘（`files.ts`/`lib/files.ts`/`lib/code.ts`）。

---

### 2.6 gridbase — Airtable 表格数据库

- **产品目标**：用「自定义字段类型的表」以网格视图管理结构化数据。
- **MVP 核心功能**：
  - 表（Table）CRUD；字段（Field）CRUD，类型：text/number/select/checkbox/date/url。
  - 行（Row）+ 单元格（Cell，按 field 存值）的网格增改。
  - 标志性特色：**可配置字段类型的电子表格网格**。
- **数据模型草图（EAV 动态结构）**：
```sql
CREATE TABLE g_tables ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL );
CREATE TABLE g_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id INTEGER NOT NULL REFERENCES g_tables(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,          -- text|number|select|checkbox|date|url
  options TEXT,               -- JSON：select 选项等
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE g_rows ( id INTEGER PRIMARY KEY AUTOINCREMENT, table_id INTEGER NOT NULL REFERENCES g_tables(id) ON DELETE CASCADE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL );
CREATE TABLE g_cells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  row_id INTEGER NOT NULL REFERENCES g_rows(id) ON DELETE CASCADE,
  field_id INTEGER NOT NULL REFERENCES g_fields(id) ON DELETE CASCADE,
  value TEXT                  -- 统一存字符串，按 field.type 解释
);
```
- **🟡 对策**：用 EAV（fields + cells）表达动态 schema，避免运行时 `ALTER TABLE`；前端用可编辑 `DataGrid`（MUI `DataGrid` 或自绘表格）。
- **建议复用**：`snippets` 的 CRUD 模式扩展到「元数据表 + 数据表」两层；字段类型枚举参考 `snippets/languages.ts` 的常量表写法。

---

### 2.7 filemanager — Files 文件管理器

- **产品目标**：在浏览器里浏览、预览与分享服务端指定目录的文件。
- **MVP 核心功能**：
  - 目录树浏览（进入/返回、列表展示文件/文件夹 + 大小/类型/修改时间）。
  - 文本/图片预览（文本直接读取，图片流式返回）。
  - 生成路径分享短链（可选，P1）。
  - 标志性特色：**服务端文件系统可视化导航**（区别于 fileshare 的上传分享）。
- **数据模型草图**（元信息为主，本体在磁盘）：
```sql
CREATE TABLE fm_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,     -- 复用 fileshare code.ts
  path TEXT NOT NULL,
  expiry TEXT,
  created_at TEXT NOT NULL
);
-- 书签（常用路径），P1：
CREATE TABLE fm_bookmarks ( id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL );
```
- **🟡 对策**：**路径安全是核心**——所有 path 必须 `path.resolve` 后校验仍在允许根目录内，拒绝 `..` 穿越；二进制流式返回复用 `fileshare` 的 `createReadStream` + `Content-Disposition`。
- **建议复用**：`fileshare` 的磁盘读取/流式下载（`files.ts` 的 download 段）+ 短码（`lib/code.ts`）。

---

### 2.8 finance — OpenBB 金融终端

- **产品目标**：提供行情面板、自选股与个股简表，模拟轻量金融终端。
- **MVP 核心功能**：
  - 行情面板：若干标的的价/涨跌/量（表格 + 迷你走势，P1）。
  - 自选股（Watchlist）CRUD，增删标的。
  - 个股简表：基础字段卡片。
  - 标志性特色：**多标的行情总览面板**。
- **数据模型草图**：
```sql
CREATE TABLE tickers ( id INTEGER PRIMARY KEY AUTOINCREMENT, symbol TEXT NOT NULL UNIQUE, name TEXT NOT NULL DEFAULT '', type TEXT NOT NULL DEFAULT 'stock' );
CREATE TABLE watchlists ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT 'My Watchlist', created_at TEXT NOT NULL );
CREATE TABLE watchlist_items ( watchlist_id INTEGER NOT NULL, ticker_id INTEGER NOT NULL, PRIMARY KEY (watchlist_id, ticker_id) );
CREATE TABLE quotes ( id INTEGER PRIMARY KEY AUTOINCREMENT, symbol TEXT NOT NULL, price REAL, change REAL, change_pct REAL, volume REAL, fetched_at TEXT NOT NULL );
```
- **🟡 对策（数据源）**：MVP **内置种子快照数据**（约 30–50 个热门标的的静态快照，落库 `quotes`），保证离线可用、零外部依赖；提供 `POST /api/refresh` 钩子（参考 `rssreader/lib/feedFetch.ts` 的 fetch 模式）对接免费行情 API（可选、需自行配置 key），刷新失败不影响现有快照。
- **建议复用**：`rssreader` 的「外部抓取 + 落库」模式（`lib/feedFetch.ts`）；CRUD 参考 `snippets`。

---

### 2.9 pastebin — 文本/代码粘贴板

- **产品目标**：把一段文本/代码生成公开短链，支持语法高亮与过期。
- **MVP 核心功能**：
  - 创建粘贴（内容 + 标题 + 语言 + 可见性 + 过期时间），返回短码。
  - 通过短链公开访问、查看（语法高亮）、复制。
  - 过期后返回 404；可删除。
  - 标志性特色：**公开短链 + 过期 + 代码高亮**（区别于 snippets 的私有无过期）。
- **数据模型草图**：
```sql
CREATE TABLE pastes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,       -- 复用 fileshare code.ts 短码
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'text',
  visibility TEXT NOT NULL DEFAULT 'public',   -- public | unlisted
  expires_at TEXT,                 -- 空=永不过期
  created_at TEXT NOT NULL
);
```
- **建议复用**：`snippets` 的 CRUD + 标签模式（去掉登录/私有语义，加 `code`+`expires_at`）；短码复用 `fileshare/lib/code.ts`；语法高亮用前端 `prismjs`/`highlight.js`（纯客户端，零后端依赖）。

---

### 2.10 pomodoro — 番茄钟 / 专注计时

- **产品目标**：用番茄工作法（专注 + 休息）配合任务清单提升专注度，并沉淀统计。
- **MVP 核心功能**：
  - 计时器：专注(25m)/短休(5m)/长休(15m)，开始/暂停/跳过，结束提醒（前端 `setInterval`）。
  - 关联任务清单（标题、预估/已完成番茄数、完成态）。
  - 会话日志 + 统计（今日/累计完成番茄数、专注时长）。
  - 标志性特色：**计时 + 任务 + 统计闭环**。
- **数据模型草图**：
```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  estimated_pomodoros INTEGER NOT NULL DEFAULT 1,
  completed_pomodoros INTEGER NOT NULL DEFAULT 0,
  is_done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,            -- focus | short_break | long_break
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_sec INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0
);
```
- **建议复用**：`snippets` 的 CRUD 模式（任务）；`sessions` 为只追加日志，统计由服务端聚合查询得出。纯单用户场景，**无需** chatroom 的 SSE 实时模式；计时完全前端实现。

---

## 3. 工程落地提示（给工程师）

1. **复制模板**：每个新 app = `client/`(Vite+React18+TS+MUI5+Tailwind3) + `server/`(Express4+TS+better-sqlite3)，从 `shared/frontend-template` 与 `shared/backend-template` 复制。
2. **注册端口**：在 `apps.ports.json` 追加 10 条（4221–4230 / 5201–5210，见上表），并在 `e2e/apps.config.ts` 同步；最后跑 `node scripts/gen-catalog.mjs` 与 `node scripts/check-consistency.mjs`（会更新 `docs/APP_CATALOG.md`）。
3. **后端约定**：`schema.sql` 定义表 → `repositories/*.ts` 仓库层 → `routes/*.ts` 路由（包 `asyncHandler`）→ `middleware/` 保持 `securityHeaders/errorHandler/notFound/asyncHandler`。
4. **前端约定**：`SettingsHelp` 提供者、`ErrorBoundary`、`MainLayout`、`pages/`、`api/client.ts`（统一 `{code,message,data}` 信封）。
5. **复用对照速查**：
   - CRUD + 多对多标签：`snippets` → keep / knowledge / pastebin / todo
   - 二进制上传 + 短码 + 磁盘：`fileshare` → gallery / filemanager / pastebin(短码)
   - 自引用树：`chatroom.messages` / `todo.tasks` → knowledge(blocks) / canvas(edges 引用 nodes)
   - 外部抓取落库：`rssreader/lib/feedFetch.ts` → finance(refresh)
   - 画布交互：`excalidraw` → canvas（节点图而非笔迹）
   - 实时 SSE：`chatroom` → 本批**无需**（pomodoro 为单用户前端计时）

---

_文档由产品经理（software-product-manager）产出，供工程师实现。约束来源：团队负责人任务说明 + `top100_data.json` + 现有 20 个 app 结构审计。_
