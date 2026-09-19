# 金融终端（finance）

克隆热门软件 **OpenBB Terminal** 的轻量网页版：行情面板、自选股、个股简表，离线优先。

## 功能

- **行情面板**：约 40 个热门标的（美股龙头 / 中概 / 港股 / A 股 / ETF / 加密货币 / 外汇 / 商品）的最新价、涨跌、涨跌幅、成交量。
- **自选股**：创建多个自选清单，向清单添加 / 移除标的。
- **个股简表**：点击行情表中的某一行，查看该标的的详情卡片。
- **刷新**：`POST /api/refresh` 默认返回离线快照（零外部依赖）；若配置了 `FINANCE_API_KEY` 环境变量可接入真实数据源覆盖快照，失败时回退快照。
- 涨红跌绿（A 股配色惯例）。

## 技术栈

- 前端：Vite + React 18 + TypeScript + MUI 5 + Tailwind 3
- 后端：Express 4 + TypeScript + better-sqlite3

## 运行

分别在 `client` 与 `server` 目录安装依赖并启动，或由仓库根目录统一编排：

```bash
# 根目录一键启动全部 App（含本 App）
npm run dev:all

# 或单独运行本 App
cd finance/client && npm install && npm run dev
cd finance/server && npm install && npm run dev
```

后端默认端口由启动器注入（`apps.ports.json` 中 finance 为 `4228` / 前端 `5208`），无需手动配置。

## 目录结构

```
finance/
├── client/        # React 前端（pages/Market 行情面板）
└── server/        # Express 后端
    ├── src/
    │   ├── repositories/  # tickers / quotes / watchlists 数据访问
    │   ├── routes/        # /api/tickers /quotes /watchlists
    │   ├── seed.ts        # 首次启动写入离线行情种子
    │   └── schema.sql     # 表结构
    └── test/        # 服务端单元测试（node:test）
```

## API 速览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/tickers` | 全部标的 |
| POST | `/api/tickers` | 新增标的 |
| GET | `/api/quotes` | 全部行情快照 |
| GET | `/api/quotes/:symbol` | 单个行情 |
| POST | `/api/refresh` | 刷新行情 |
| GET | `/api/watchlists` | 自选清单列表 |
| POST | `/api/watchlists` | 新建自选清单 |
| DELETE | `/api/watchlists/:id` | 删除自选清单 |
| POST | `/api/watchlists/:id/items` | 向清单添加标的 |
| DELETE | `/api/watchlists/:id/items/:tickerId` | 移除标的 |
