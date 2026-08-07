# 短链接 · Shlink 克隆

短链接生成与点击统计：把长链压缩成 6 位短码，302 跳转回原链，并对每次访问计数。

## 功能

- 长链 → 短码：服务端生成随机短码（62 字符字母表 + 唯一索引防碰撞）
- 短链访问：`GET /r/:code` 302 跳转原链，并原子 +1 点击计数
- 列表页：全部短链 + 创建 / 删除（二次确认）/ 复制短链 / 打开原链
- 统计：单链点击数、总数、总点击量（列表页顶部汇总卡 + 详情页）
- 持久化：后端 SQLite（`server/data/app.db`），API 走 `{ code, message, data }` 信封

## 运行

```bash
# 前端
cd shlink/client && npm install && npm run dev      # http://localhost:5193

# 后端
cd shlink/server && npm install && npm run dev      # http://localhost:4213
```

或从仓库根一键拉起：

```bash
node scripts/start-app.mjs shlink
```

## 验证

```bash
cd shlink/client && npm test        # vitest（utils 单测）
cd shlink/server && npm test        # vitest（短码算法 + API 集成测试）
```

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/links` | 创建短链 `{ url, title? }` → 返回短链对象 |
| GET | `/api/links` | 全部短链 + 汇总 `{ links, summary }` |
| GET | `/api/links/:id` | 单条短链（含点击数） |
| DELETE | `/api/links/:id` | 删除短链 |
| GET | `/r/:code` | 302 跳转原链并计数 |
