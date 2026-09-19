# File Manager · 文件管理器

复刻 Files 的极简文件管理器：在浏览器里浏览、预览与分享服务端目录的文件。所有访问被严格限制在一个**虚拟根目录**（`server/data/fm-root/`）内，绝不暴露宿主机真实文件系统。

## 目录结构

```
filemanager/
├── client/   # React + MUI + Tailwind 前端
└── server/   # Express + better-sqlite3 后端
```

## 运行

端口由启动器运行时注入（`PORT` / `CORS_ORIGIN`），无需硬编码。本地手动运行：

```bash
# 后端
cd filemanager/server
npm install
npm run dev          # 开发（tsx watch），或 npm run build && npm start
npm test             # 运行 vitest 服务端测试（含路径穿越防护用例）

# 前端
cd filemanager/client
npm install
npm run dev
npm run build        # tsc -b && vite build
```

首次启动会在虚拟根目录写入示例 `README.txt` 与 `samples/hello.txt`，方便直接体验。把文件放进 `server/data/fm-root/` 后刷新即可看到。

## 主要 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/browse?path=/` | 列出目录（文件/文件夹 + 大小/类型/修改时间） |
| GET | `/api/preview?path=/...` | 文本直接返回、图片 inline 流式返回 |
| GET | `/api/download?path=/...` | 二进制 attachment 流式下载 |
| POST | `/api/shares` | 创建路径分享短链（`{path, expiry?}`） |
| GET | `/api/s/:code` | 通过短码下载被分享文件 |
| GET/POST/DELETE | `/api/bookmarks` | 书签（快捷目录）增删查 |

## 安全要点（路径穿越防护）

- 设定虚拟根目录 `FM_ROOT`（`server/data/fm-root/`），首次运行自动 `mkdir`。
- 任何用户传入的 `path` 都先 `path.resolve(root, userPath)` 规范化，再用 `path.relative(root, resolved)` 校验结果位于根内；只要 relative 以 `..` 开头即判定越界并拒绝（返回 400），**无法穿越到宿主机其它位置**。
- 流式下载复用 `createReadStream` + RFC 6266 `filename*`（中文名安全）。
- 已接入 `securityHeaders` 中间件。
