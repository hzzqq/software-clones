#!/usr/bin/env node
/**
 * 一键启动全部 12 个 App（每个 app = 后端 + 前端），默认 daemon 模式。
 *
 *   npm run dev:all                # daemon：拉起后脚本立刻退出，关窗不影响
 *   npm run dev:all -- --foreground # 前台调试：Ctrl+C 统一停止
 *   npm run stop:all               # 停止全部
 *   npm run dev:status             # 查看运行状态
 *
 * 端口分配见根目录 apps.ports.json。日志落在 logs/<app>-{server,client}.log，
 * PID 记录在 scripts/.pids/<app>.json。
 */
import {
  APPS,
  startServer,
  startClient,
  killTree,
  killByPort,
  waitForHealth,
  waitForHttp,
  isPortListening,
  writePidFile,
} from './apps.mjs';

const argv = process.argv.slice(2);
const foreground = argv.includes('--foreground');

if (foreground) {
  // ── 前台调试模式：沿用旧行为 ──
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

  printTable(results);
  console.log('\n按 Ctrl+C 停止全部服务。');

  // 保持前台
  setInterval(() => {}, 1 << 30);
} else {
  // ── daemon 模式 ──
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

  const bad = results.filter((r) => !r.server || !r.client);
  if (bad.length > 0) {
    console.log(`\n${bad.length} 个应用未完全就绪，详见 logs/ 下对应日志。`);
  } else {
    console.log(`\n全部 ${APPS.length} 个应用已在后台运行。`);
  }
  console.log('停止全部: npm run stop:all');
  console.log('查看状态: npm run dev:status');

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
