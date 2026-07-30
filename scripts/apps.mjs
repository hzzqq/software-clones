/**
 * 启动脚本共用工具：端口表（单一真源）+ Windows 友好的进程启动/清理。
 *
 * 两个反复踩到的 Windows 坑，统一在这里处理掉：
 * 1. spawn('npm', ...) 在 Windows 上会 ENOENT —— npm 实际是 npm.cmd，必须走 shell；
 * 2. child.kill() 只杀父进程，npm → tsx/vite → node 的子进程仍占着端口，
 *    必须用 taskkill /T 杀整棵树，并按端口兜底复查。
 */
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps.ports.json'), 'utf8'));

/** @type {{name:string, serverPort:number, clientPort:number}[]} */
export const APPS = raw.apps;

export const IS_WIN = process.platform === 'win32';

export function findApp(name) {
  return APPS.find((a) => a.name === name) ?? null;
}

/**
 * 启动一个 npm 脚本。stdio 传 'inherit' 直接透传，或传日志文件名落盘到 logs/。
 */
export function spawnNpm(args, { env = {}, logFile = null } = {}) {
  let stdio = 'inherit';
  if (logFile) {
    const logPath = path.join(ROOT, 'logs', logFile);
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    const fd = fs.openSync(logPath, 'a');
    stdio = ['ignore', fd, fd];
  }
  return spawn('npm', args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio,
    shell: IS_WIN, // 关键：Windows 上 npm 是 npm.cmd
  });
}

export function startServer(app, { logFile = null, extraEnv = {} } = {}) {
  return spawnNpm(['--prefix', `${app.name}/server`, 'run', 'dev'], {
    env: { PORT: String(app.serverPort), CORS_ORIGIN: '*', ...extraEnv },
    logFile,
  });
}

export function startClient(app, { logFile = null } = {}) {
  return spawnNpm(
    ['--prefix', `${app.name}/client`, 'run', 'dev', '--', '--port', String(app.clientPort), '--strictPort'],
    {
      env: { VITE_API_BASE: `http://localhost:${app.serverPort}/api` },
      logFile,
    },
  );
}

/** 同步杀掉进程树。必须同步：异步 spawn 在主进程 exit 时来不及执行。 */
export function killTree(pid) {
  if (!pid) return;
  try {
    if (IS_WIN) execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
    else process.kill(pid, 'SIGTERM');
  } catch {
    /* 进程可能已退出 */
  }
}

/** 按端口找到监听进程并杀掉整棵树，兜住 npm 派生出的孤儿进程。 */
export function killByPort(port) {
  if (!IS_WIN) return;
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    for (const line of out.split('\n')) {
      const m = line.match(new RegExp(`:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`));
      if (m) killTree(m[1]);
    }
  } catch {
    /* 端口无监听时 findstr 退出码为 1 */
  }
}

/** 轮询 /api/health 直到就绪。 */
export async function waitForHealth(port, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.ok) return true;
    } catch {
      /* 还没起来 */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/** 轮询前端 dev server 首页直到可访问。 */
export async function waitForHttp(port, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.status < 500) return true;
    } catch {
      /* 还没起来 */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
