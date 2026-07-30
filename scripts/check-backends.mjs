#!/usr/bin/env node
/**
 * 后端全量健康校验（不依赖 Playwright / 浏览器）。
 *
 * 用法：node scripts/check-backends.mjs
 *
 * 做的事：
 *   1. 按 e2e 端口表逐个拉起 12 个 app 的后端（tsx watch 关掉，用一次性 node 进程）；
 *   2. 轮询 /api/health，最长 30s；
 *   3. 打印 OK/FAIL 汇总表，全部 OK 则 exit 0，否则 exit 1；
 *   4. 无论成败都清理子进程。
 *
 * 每个 app 用独立的临时 DB（DB_PATH 指到 os.tmpdir()），避免污染开发库。
 */
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const APPS = [
  { name: 'markdown', dir: 'markdown/server', port: 4201 },
  { name: 'apiclient', dir: 'apiclient/server', port: 4202 },
  { name: 'tvtime', dir: 'tvtime/server', port: 4203 },
  { name: 'excalidraw', dir: 'excalidraw/server', port: 4204 },
  { name: 'photopea', dir: 'photopea/server', port: 4205 },
  { name: 'it-tools', dir: 'it-tools/server', port: 4206 },
  { name: 'kanban', dir: 'kanban/server', port: 4207 },
  { name: 'glance', dir: 'glance/server', port: 4208 },
  { name: 'kener', dir: 'kener/server', port: 4209 },
  { name: 'memos', dir: 'memos/server', port: 4210 },
  { name: 'lofi', dir: 'lofi/server', port: 4211 },
  { name: 'nonio', dir: 'nonio/server', port: 4212 },
];

const TMP = path.join(os.tmpdir(), 'software-clones-health');
fs.mkdirSync(TMP, { recursive: true });

const children = [];
const logs = new Map();

function startServer(app) {
  const cwd = path.join(ROOT, app.dir);
  const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
    cwd,
    env: {
      ...process.env,
      PORT: String(app.port),
      CORS_ORIGIN: '*',
      DB_PATH: path.join(TMP, `${app.name}.db`),
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  logs.set(app.name, '');
  const collect = (buf) => logs.set(app.name, (logs.get(app.name) + buf.toString()).slice(-4000));
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  children.push(child);
  return child;
}

async function waitHealth(app, timeoutMs = 45_000) {
  const url = `http://127.0.0.1:${app.port}/api/health`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json();
        return { ok: true, body };
      }
    } catch {
      /* 还没起来 */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return { ok: false };
}

/**
 * 同步清理。必须用 execSync：spawn 是异步的，主进程 exit 太快会导致
 * taskkill 根本没执行，端口继续被 tsx/node 子进程占着（踩过这个坑）。
 * 同时按端口兜底一遍，杀掉 npm→tsx→node 派生出的孤儿进程。
 */
function cleanup() {
  for (const child of children) {
    try {
      if (process.platform === 'win32' && child.pid) {
        execSync(`taskkill /F /T /PID ${child.pid}`, { stdio: 'ignore' });
      } else {
        child.kill('SIGTERM');
      }
    } catch {
      /* 进程可能已退出 */
    }
  }
  if (process.platform !== 'win32') return;
  for (const app of APPS) {
    try {
      const out = execSync(`netstat -ano | findstr :${app.port}`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      for (const line of out.split('\n')) {
        const m = line.match(new RegExp(`:${app.port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`));
        if (m) {
          try {
            execSync(`taskkill /F /T /PID ${m[1]}`, { stdio: 'ignore' });
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* 端口无监听 */
    }
  }
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});

const results = [];
try {
  console.log(`启动 ${APPS.length} 个后端…\n`);
  for (const app of APPS) startServer(app);

  for (const app of APPS) {
    const r = await waitHealth(app);
    results.push({ app, ...r });
    const tag = r.ok ? 'OK  ' : 'FAIL';
    console.log(`${tag} ${app.name.padEnd(12)} :${app.port}  ${r.ok ? JSON.stringify(r.body) : ''}`);
    if (!r.ok) {
      const log = (logs.get(app.name) || '').trim().split('\n').slice(-8).join('\n');
      if (log) console.log(`     ↳ 日志尾部:\n${log.replace(/^/gm, '       ')}`);
    }
  }
} finally {
  cleanup();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n汇总: ${results.length - failed.length}/${results.length} 后端健康`);
process.exit(failed.length === 0 ? 0 : 1);
