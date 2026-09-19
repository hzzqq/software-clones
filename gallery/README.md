# Gallery · 自托管相册

复刻 Immich 的极简自托管相册：图片上传、相册归类、标签、按时间浏览与灯箱预览。元信息存 SQLite，图片本体落盘到 `server/data/gallery/`。

## 目录结构

```
gallery/
├── client/   # React + MUI + Tailwind 前端
└── server/   # Express + better-sqlite3 后端
```

## 运行

端口由启动器运行时注入（`PORT` / `CORS_ORIGIN`），无需硬编码。本地手动运行：

```bash
# 后端
cd gallery/server
npm install
npm run dev          # 开发（tsx watch），或 npm run build && npm start
npm test             # 运行 vitest 服务端测试

# 前端
cd gallery/client
npm install
npm run dev          # Vite 开发服务器
npm run build        # tsc -b && vite build
```

## 主要 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/assets` | 原始二进制上传（头 `X-File-Name`/`X-Mime-Type`/`X-Width`/`X-Height`），返回资源 |
| GET | `/api/assets` | 列表，支持 `?album=&tag=&from=&to=` 筛选 |
| GET | `/api/assets/:id/file` | 流式返回图片（inline），供缩略图与灯箱 |
| DELETE | `/api/assets/:id` | 删除资源与磁盘文件 |
| GET/POST | `/api/albums` | 相册列表 / 创建 |
| POST | `/api/albums/:id/assets` | 加入资源（`assetId` 或 `assetIds`） |
| DELETE | `/api/albums/:id/assets/:assetId` | 移出资源 |
| GET/POST | `/api/tags` | 标签列表 / 创建 |
| POST | `/api/assets/:id/tags` | 给资源打标签 |

## 安全要点

- 上传零依赖（`express.raw` 接收二进制 + `X-File-Name` 头），不引入 multer。
- 落盘文件名由服务端短码 + 扩展名生成，**不拼接用户文件名到路径**，杜绝目录穿越。
- 已接入 `securityHeaders` 中间件（X-Content-Type-Options / X-Frame-Options / Referrer-Policy）。
- 图片流式返回使用 RFC 6266 `filename*` 解决中文名下载/预览。
