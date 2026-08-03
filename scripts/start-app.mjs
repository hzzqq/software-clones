#!/usr/bin/env node
/**
 * 启动单个 App（后端 + 前端），默认 daemon 模式。
 *
 *   npm run dev:app -- memos                # daemon：拉起后脚本立刻退出，关窗不影响
 *   npm run dev:app -- memos --foreground   # 前台调试：日志透传当前终端，Ctrl+C 停止
 *   npm run stop:app -- memos               # 停止
 *
 * 端口分配见根目录 apps.ports.json。daemon 模式日志落在 logs/<app>-{server,client}.log，
 * PID 记录在 scripts/.pids/<app>.json。
 */
import {
  APPS,
  findApp,
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
const name = argv.find((a) => !a.startsWith('--'));
const app = name ? findApp(name) : null;

if (!app) {
  console.error('用法: node scripts/start-app.mjs <app> [--foreground]');
  console.error('可选: ' + APPS.map((a) => a.name).join(', '));
  process.exit(1);
}

if (foreground) {
  // ── 前台调试模式：沿用旧行为（继承 stdio + 阻塞 + Ctrl+C 清理，不写 PID 文件）──
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
} else {
  // ── daemon 模式 ──
  if (isPortListening(app.clientPort)) {
    console.log(`[${app.name}] 已在运行  http://localhost:${app.clientPort}`);
    console.log(`停止：npm run stop:app -- ${app.name}`);
    process.exit(0);
  }

  const server = startServer(app, { detached: true, logFile: `${app.name}-server.log` });
  const client = startClient(app, { detached: true, logFile: `${app.name}-client.log` });

  console.log(`[${app.name}] 正在后台启动（server pid=${server.pid}, client pid=${client.pid}），等待就绪…`);

  const [serverOk, clientOk] = await Promise.all([
    waitForHealth(app.serverPort),
    waitForHttp(app.clientPort),
  ]);

  writePidFile(app.name, {
    serverPid: server.pid ?? null,
    clientPid: client.pid ?? null,
    serverPort: app.serverPort,
    clientPort: app.clientPort,
    startedAt: new Date().toISOString(),
  });

  console.log('');
  console.log(`[${app.name}] 后端 ${serverOk ? 'OK' : 'FAIL'}  http://localhost:${app.serverPort}/api/health`);
  console.log(`[${app.name}] 前端 ${clientOk ? 'OK' : 'FAIL'}  http://localhost:${app.clientPort}`);
  console.log('');
  console.log(`访问: http://localhost:${app.clientPort}`);
  console.log(`停止: npm run stop:app -- ${app.name}`);
  console.log(`日志: logs/${app.name}-server.log, logs/${app.name}-client.log`);
  if (!serverOk || !clientOk) console.log('（部分服务未就绪，详见上述日志）');

  // 子进程已 detached + unref，这里直接退出，进程继续在独立进程组里存活。
  process.exit(0);
}
