#!/usr/bin/env node
/**
 * 停止单个 daemon 模式启动的 App。
 *
 *   npm run stop:app -- memos
 *   node scripts/stop-app.mjs memos
 *
 * 双保险：先按 PID 文件里记录的 pid 杀整棵进程树，再按端口兜底
 * （npm → tsx/vite → node 常派生出脱离父子关系的孤儿进程）。
 */
import { APPS, findApp, killTree, killByPort, readPidFile, removePidFile, isPortListening } from './apps.mjs';

/**
 * 停止一个 app，返回是否真的停下了东西。
 * @param {{name:string, serverPort:number, clientPort:number}} app
 * @returns {{name:string, wasRunning:boolean, stopped:boolean, pids:number[]}}
 */
export function stopApp(app) {
  const wasRunning = isPortListening(app.serverPort) || isPortListening(app.clientPort);
  const rec = readPidFile(app.name);
  const pids = [];

  if (rec) {
    if (rec.serverPid) pids.push(rec.serverPid);
    if (rec.clientPid) pids.push(rec.clientPid);
    for (const pid of pids) killTree(pid);
  }

  // 端口兜底：杀掉仍占着端口的孤儿进程
  killByPort(app.serverPort);
  killByPort(app.clientPort);

  removePidFile(app.name);

  const stopped = !isPortListening(app.serverPort) && !isPortListening(app.clientPort);
  return { name: app.name, wasRunning, stopped, pids };
}

// ── CLI 入口（被 stop-all.mjs import 时不执行）──
const isCli = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/stop-app.mjs');

if (isCli) {
  const name = process.argv[2];
  const app = name ? findApp(name) : null;

  if (!app) {
    console.error('用法: node scripts/stop-app.mjs <app>');
    console.error('可选: ' + APPS.map((a) => a.name).join(', '));
    process.exit(1);
  }

  const r = stopApp(app);
  if (!r.wasRunning) {
    console.log(`[${app.name}] 本来就没在运行（PID 文件已清理）。`);
  } else if (r.stopped) {
    console.log(`[${app.name}] 已停止  端口 :${app.serverPort} / :${app.clientPort} 已释放`);
  } else {
    console.log(`[${app.name}] 停止失败：端口仍被占用，请手动检查 netstat -ano | findstr :${app.clientPort}`);
    process.exit(1);
  }
  process.exit(0);
}
