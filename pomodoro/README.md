# 番茄钟（pomodoro）

克隆 **番茄工作法（Pomodoro Technique）** 的网页工具：用番茄计时配合任务清单提升专注度，并沉淀统计。

## 功能

- **计时器（纯前端实现）**：专注 25 分钟 / 短休 5 分钟 / 长休 15 分钟；开始 / 暂停 / 跳过；结束浏览器通知。
- **任务清单**：标题、预估番茄数、已完成番茄数、完成态。
- **会话日志与统计**：每次专注结束追加一条会话记录；统计视图展示今日 / 累计完成番茄数与专注时长（由服务端聚合）。

## 技术栈

- 前端：Vite + React 18 + TypeScript + MUI 5 + Tailwind 3
- 后端：Express 4 + TypeScript + better-sqlite3

## 运行

```bash
npm run dev:all
# 或单独
cd pomodoro/client && npm install && npm run dev
cd pomodoro/server && npm install && npm run dev
```

后端端口由启动器注入（`apps.ports.json` 中 pomodoro 为 `4230` / 前端 `5210`）。

## API 速览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/tasks` | 任务列表 |
| POST | `/api/tasks` | 新建任务 |
| PATCH | `/api/tasks/:id` | 更新任务（含完成态 / 已完成番茄数） |
| DELETE | `/api/tasks/:id` | 删除任务 |
| POST | `/api/sessions` | 记录一条专注会话 |
| GET | `/api/stats` | 统计（今日 / 累计番茄数与专注时长） |
