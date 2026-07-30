#!/usr/bin/env node
/**
 * 一键启动全部 12 个 App（每个 app = 后端 + 前端）。
 *
 *   npm run dev:all
 *
 * 端口分配见根目录 apps.ports.json。日志落在 logs/<app>-{server,client}.log。
 * 启动后会等待各服务就绪并打印一张状态表，Ctrl+C 统一停止（含子进程树）。
 */
import {
  APPS,
  startServer,
  startClient,
  killTree,
  killByPort,
  waitForHealth,
  waitForHttp,
} from './apps.mjs';

const procs = [];

for (const app of APPS) {
  procs.push(startServer(app, { logFile: `${app.name}-server.log` }));
  procs.push(startClient(app, { logFile: `${app.name}-client.log` }));
}

console.log(`已拉起 ${APPS.length} 个应用（${procs.length} 个进程），等待就绪…\n`);

let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\n正在停止所有进程…');
  for (const p of procs) killTree(p.pid);
  for (const app of APPS) {
    killByPort(app.serverPort);
    killByPort(app.clientPort);
  }
  console.log('已全部停止。');
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const results = await Promise.all(
  APPS.map(async (app) => ({
    app,
    server: await waitForHealth(app.serverPort),
    client: await waitForHttp(app.clientPort),
  })),
);

console.log('APP            后端                前端');
console.log('─'.repeat(52));
for (const { app, server, client } of results) {
  const s = server ? `OK   :${app.serverPort}` : `FAIL :${app.serverPort}`;
  const c = client ? `OK   :${app.clientPort}` : `FAIL :${app.clientPort}`;
  console.log(`${app.name.padEnd(14)} ${s.padEnd(19)} ${c}`);
}

const bad = results.filter((r) => !r.server || !r.client);
if (bad.length > 0) {
  console.log(`\n${bad.length} 个应用未完全就绪，详见 logs/ 下对应日志。`);
} else {
  console.log(`\n全部 ${APPS.length} 个应用已就绪。前端入口：`);
  for (const app of APPS) console.log(`  ${app.name.padEnd(12)} http://localhost:${app.clientPort}`);
}
console.log('\n按 Ctrl+C 停止全部服务。');

// 保持前台
setInterval(() => {}, 1 << 30);
