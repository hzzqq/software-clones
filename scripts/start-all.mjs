#!/usr/bin/env node
/**
 * 一键启动全部 12 个 App（每个 app = 后端 + 前端）+ 启动大厅，默认 daemon 模式。
 *
 *   npm run dev:all                # daemon：拉起后脚本立刻退出，关窗不影响，自动打开浏览器指向大厅
 *   npm run dev:all -- --foreground # 前台调试：Ctrl+C 统一停止（不自动打开浏览器）
 *   npm run stop:all               # 停止全部 App（大厅单独: npm run stop:hall）
 *   npm run dev:status             # 查看运行状态
 *
 * 端口分配见根目录 apps.ports.json（App 前端 5180–5191，大厅 5192）。
 * 日志落在 logs/<app>-{server,client}.log 与 logs/hall.log，
 * PID 记录在 scripts/.pids/<app>.json 与 scripts/.pids/hall.json。
 */
import {
  APPS,
  startServer,
  startClient,
  startStaticServer,
  killTree,
  killByPort,
  waitForHealth,
  waitForHttp,
  isPortListening,
  writePidFile,
  HALL_PORT,
  HALL_DIR,
  openBrowser,
} from './apps.mjs';
import { ensureHallDaemon } from './hall-server.mjs';

const argv = process.argv.slice(2);
const foreground = argv.includes('--foreground');

if (foreground) {
  // ── 前台调试模式：沿用旧行为 + 大厅一起拉起 ──
  const procs = [];
  for (const app of APPS) {
    procs.push(startServer(app, { logFile: `${app.name}-server.log` }));
    procs.push(startClient(app, { logFile: `${app.name}-client.log` }));
  }
  procs.push(startStaticServer({ port: HALL_PORT, dir: HALL_DIR })); // 大厅，继承 stdio

  console.log(`已拉起 ${APPS.length} 个应用 + 大厅（${procs.length} 个进程），等待就绪…\n`);

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
    killByPort(HALL_PORT);
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

  printTable(results);
  console.log(`大厅: http://localhost:${HALL_PORT}/  （--foreground 不自动打开浏览器）`);
  console.log('\n按 Ctrl+C 停止全部服务。');

  // 保持前台
  setInterval(() => {}, 1 << 30);
} else {
  // ── daemon 模式 ──
  // 1) 大厅（幂等：已在运行则跳过）
  const hall = await ensureHallDaemon();

  // 2) 12 个 App
  /** @type {{app:object, server:import('node:child_process').ChildProcess|null, client:import('node:child_process').ChildProcess|null, skipped:boolean}[]} */
  const launched = [];

  for (const app of APPS) {
    if (isPortListening(app.clientPort)) {
      console.log(`[${app.name}] 已在运行，跳过  http://localhost:${app.clientPort}`);
      launched.push({ app, server: null, client: null, skipped: true });
      continue;
    }
    const server = startServer(app, { detached: true, logFile: `${app.name}-server.log` });
    const client = startClient(app, { detached: true, logFile: `${app.name}-client.log` });
    launched.push({ app, server, client, skipped: false });
  }

  const started = launched.filter((l) => !l.skipped);
  console.log(`\n已后台拉起 ${started.length} 个应用（${started.length * 2} 个进程），等待就绪…\n`);

  const results = await Promise.all(
    launched.map(async ({ app, server, client, skipped }) => ({
      app,
      skipped,
      serverPid: server?.pid ?? null,
      clientPid: client?.pid ?? null,
      server: await waitForHealth(app.serverPort),
      client: await waitForHttp(app.clientPort),
    })),
  );

  for (const r of results) {
    if (r.skipped) continue; // 已在运行的沿用它自己的 PID 文件
    writePidFile(r.app.name, {
      serverPid: r.serverPid,
      clientPid: r.clientPid,
      serverPort: r.app.serverPort,
      clientPort: r.app.clientPort,
      startedAt: new Date().toISOString(),
    });
  }

  printTable(results);

  console.log(`\n大厅: ${hall.ok ? '已就绪' : '启动异常'}  http://localhost:${HALL_PORT}/`);

  const bad = results.filter((r) => !r.server || !r.client);
  if (bad.length > 0) {
    console.log(`\n${bad.length} 个应用未完全就绪，详见 logs/ 下对应日志。`);
  } else {
    console.log(`\n全部 ${APPS.length} 个应用已在后台运行。`);
  }
  console.log('停止全部 App: npm run stop:all   |   停止大厅: npm run stop:hall');
  console.log('查看状态: npm run dev:status');

  // 仅 daemon 模式自动打开浏览器；沙箱/CI 无浏览器时 openBrowser 内部兜底打印提示
  openBrowser(`http://localhost:${HALL_PORT}/`);

  process.exit(0);
}

/**
 * 打印状态表。
 * @param {{app:{name:string,serverPort:number,clientPort:number}, server:boolean, client:boolean}[]} results
 */
function printTable(results) {
  console.log('APP            后端                前端                访问地址');
  console.log('─'.repeat(78));
  for (const { app, server, client } of results) {
    const s = server ? `OK   :${app.serverPort}` : `FAIL :${app.serverPort}`;
    const c = client ? `OK   :${app.clientPort}` : `FAIL :${app.clientPort}`;
    const url = `http://localhost:${app.clientPort}`;
    console.log(`${app.name.padEnd(14)} ${s.padEnd(19)} ${c.padEnd(19)} ${url}`);
  }
}
