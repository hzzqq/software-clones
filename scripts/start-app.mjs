#!/usr/bin/env node
/**
 * 启动单个 App（后端 + 前端）。
 *
 *   npm run dev:app -- memos
 *   node scripts/start-app.mjs memos
 *
 * 端口分配见根目录 apps.ports.json。日志直接透传到当前终端，Ctrl+C 统一停止。
 */
import { APPS, findApp, startServer, startClient, killTree, killByPort, waitForHealth, waitForHttp } from './apps.mjs';

const name = process.argv[2];
const app = name ? findApp(name) : null;

if (!app) {
  console.error('用法: node scripts/start-app.mjs <app>');
  console.error('可选: ' + APPS.map((a) => a.name).join(', '));
  process.exit(1);
}

const server = startServer(app);
const client = startClient(app);

let shuttingDown = false;
const stop = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  killTree(server.pid);
  killTree(client.pid);
  killByPort(app.serverPort);
  killByPort(app.clientPort);
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

const [serverOk, clientOk] = await Promise.all([
  waitForHealth(app.serverPort),
  waitForHttp(app.clientPort),
]);

console.log('');
console.log(`[${app.name}] 后端 ${serverOk ? 'OK' : 'FAIL'}  http://localhost:${app.serverPort}/api/health`);
console.log(`[${app.name}] 前端 ${clientOk ? 'OK' : 'FAIL'}  http://localhost:${app.clientPort}`);
console.log('按 Ctrl+C 停止。\n');
