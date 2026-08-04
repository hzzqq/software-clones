/**
 * 启动脚本共用工具：端口表（单一真源）+ Windows 友好的进程启动/清理 + daemon 支持。
 *
 * 三个反复踩到的 Windows 坑，统一在这里处理掉：
 * 1. spawn('npm', ...) 在 Windows 上会 ENOENT —— npm 实际是 npm.cmd，必须走 shell；
 * 2. child.kill() 只杀父进程，npm → tsx/vite → node 的子进程仍占着端口，
 *    必须用 taskkill /T 杀整棵树，并按端口兜底复查；
 * 3. 不加 detached 的子进程与启动窗口同属一个进程组，关窗时 Windows 会广播
 *    CTRL_CLOSE_EVENT 把整组杀掉 —— 必须 detached:true + 不继承 stdio + unref()
 *    三件套齐上，子进程才能真正脱离窗口独立存活。
 */
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** daemon 模式下记录子进程 PID 的目录。 */
export const PIDS_DIR = path.join(ROOT, 'scripts', '.pids');

const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps.ports.json'), 'utf8'));

/** @type {{name:string, serverPort:number, clientPort:number}[]} */
export const APPS = raw.apps;

export const IS_WIN = process.platform === 'win32';

export function findApp(name) {
  return APPS.find((a) => a.name === name) ?? null;
}

let cachedNpmCli;

/**
 * 找到 npm 的 JS 入口（npm-cli.js）。
 *
 * 为什么需要它：Windows 上 `spawn('npm', …, { shell:true, detached:true })` 会创建一个
 * 无 console 的 cmd.exe，实测**孙进程（node.exe / npm.cmd）的 stdout/stderr 会丢失**
 * —— 日志文件永远是 0 字节（cmd 自身的 builtin 输出正常，孙进程的不行）。
 * 直接用 node.exe 跑 npm-cli.js 就绕开了 cmd.exe，fd 重定向恢复正常。
 *
 * @returns {string|null} 找不到时返回 null，调用方回退到 shell 方案
 */
function resolveNpmCli() {
  if (cachedNpmCli !== undefined) return cachedNpmCli;

  const nodeDir = path.dirname(process.execPath);
  const candidates = [
    // 当前若由 npm run 触发，npm_execpath 直接指向 npm-cli.js
    process.env.npm_execpath && process.env.npm_execpath.endsWith('.js') ? process.env.npm_execpath : null,
    path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'), // Windows 安装布局
    path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'), // POSIX 安装布局
  ].filter(Boolean);

  cachedNpmCli = candidates.find((c) => fs.existsSync(c)) ?? null;
  return cachedNpmCli;
}

/**
 * 启动一个 npm 脚本。
 *
 * @param {string[]} args npm 参数
 * @param {object}   [opts]
 * @param {object}   [opts.env]      追加的环境变量
 * @param {string}   [opts.logFile]  日志文件名（落盘到 logs/），不传则继承当前终端 stdio
 * @param {boolean}  [opts.detached] 是否脱离启动窗口独立运行（daemon 模式）
 * @returns {import('node:child_process').ChildProcess}
 */
export function spawnNpm(args, { env = {}, logFile = null, detached = false } = {}) {
  let stdio = 'inherit';
  if (logFile) {
    const logPath = path.join(ROOT, 'logs', logFile);
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    const fd = fs.openSync(logPath, 'a');
    stdio = ['ignore', fd, fd];
  } else if (detached) {
    // daemon 模式绝不能继承父进程 stdio，否则父进程退出/关窗会连带影响子进程。
    stdio = 'ignore';
  }

  const spawnOpts = {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio,
  };

  let child;
  if (detached) {
    const npmCli = resolveNpmCli();
    if (npmCli) {
      // 首选：node.exe 直跑 npm-cli.js，绕开 cmd.exe，日志重定向才不会丢。
      child = spawn(process.execPath, [npmCli, ...args], { ...spawnOpts, detached: true });
    } else {
      // 回退：找不到 npm-cli.js 时仍要能启动（此时 Windows 下日志可能为空）。
      child = spawn('npm', args, { ...spawnOpts, shell: IS_WIN, detached: true });
    }
    // 关键：从父进程的事件循环引用中摘掉，父进程才能立刻退出。
    child.unref();
  } else {
    // 前台/兼容路径：保持原行为不变（check-backends.mjs 等依赖它）。
    child = spawn('npm', args, { ...spawnOpts, shell: IS_WIN }); // Windows 上 npm 是 npm.cmd
  }

  return child;
}

export function startServer(app, { logFile = null, extraEnv = {}, detached = false } = {}) {
  return spawnNpm(['--prefix', `${app.name}/server`, 'run', 'dev'], {
    env: { PORT: String(app.serverPort), CORS_ORIGIN: '*', ...extraEnv },
    logFile,
    detached,
  });
}

export function startClient(app, { logFile = null, detached = false } = {}) {
  return spawnNpm(
    ['--prefix', `${app.name}/client`, 'run', 'dev', '--', '--port', String(app.clientPort), '--strictPort'],
    {
      env: { VITE_API_BASE: `http://localhost:${app.serverPort}/api` },
      logFile,
      detached,
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

/**
 * 端口上是否已有进程在 LISTENING。用于幂等判断「这个 app 是不是已经在跑了」。
 * @param {number} port
 * @returns {boolean}
 */
export function isPortListening(port) {
  try {
    if (IS_WIN) {
      const out = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return new RegExp(`:${port}\\s+\\S+\\s+LISTENING\\s+\\d+`).test(out);
    }
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.trim().length > 0;
  } catch {
    // findstr / lsof 无匹配时退出码非 0
    return false;
  }
}

function pidFilePath(appName) {
  return path.join(PIDS_DIR, `${appName}.json`);
}

/**
 * 读取 app 的 PID 记录。
 * @param {string} appName
 * @returns {{serverPid:number|null, clientPid:number|null, serverPort:number, clientPort:number, startedAt:string}|null}
 */
export function readPidFile(appName) {
  try {
    return JSON.parse(fs.readFileSync(pidFilePath(appName), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * 写入 app 的 PID 记录（目录不存在先创建）。
 * @param {string} appName
 * @param {object} obj
 */
export function writePidFile(appName, obj) {
  fs.mkdirSync(PIDS_DIR, { recursive: true });
  fs.writeFileSync(pidFilePath(appName), `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
}

/**
 * 删除 app 的 PID 记录。文件不存在时静默返回。
 * 先用 unlink（单文件删除的精确语义），失败再退回 rm，两者都失败才放弃 ——
 * 残留的 PID 文件不会造成误判（running 与否一律以端口为准），只会在 dev:status 里提示。
 * @returns {boolean} 是否已确认删除
 */
export function removePidFile(appName) {
  const p = pidFilePath(appName);
  if (!fs.existsSync(p)) return true;
  try {
    fs.unlinkSync(p);
  } catch {
    try {
      fs.rmSync(p, { force: true });
    } catch {
      /* 忽略：交由 dev:status 提示残留 */
    }
  }
  return !fs.existsSync(p);
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

/** 大厅静态服务端口（刻意避开各 App 前端的 5180–5191）。 */
export const HALL_PORT = 5192;

/** 大厅产物目录（hall/index.html 由 scripts/gen-hall.mjs 生成并提交进 git）。 */
export const HALL_DIR = path.join(ROOT, 'hall');

/** 大厅静态服务器入口（node scripts/hall-server.mjs，被 startStaticServer 以子进程拉起）。 */
export const HALL_SCRIPT = path.join(ROOT, 'scripts', 'hall-server.mjs');

/**
 * 启动一个零依赖的静态文件服务器（node 原生 http，复用大厅服务器实现）。
 *
 * 通过子进程运行 `node scripts/hall-server.mjs --serve <port> <dir>`：
 * - 与 npm 无关，因此 Windows 上无需 shell，直接用 process.execPath（node.exe）；
 * - daemon 模式沿用「detached + 日志文件 + unref」三件套，父进程可立即退出。
 *
 * @param {object}   [opts]
 * @param {number}   [opts.port]     监听端口（默认大厅 5192）
 * @param {string}   [opts.dir]      静态文件根目录（默认 hall/）
 * @param {string}   [opts.logFile]  日志文件名（落盘到 logs/），不传则继承当前终端 stdio
 * @param {boolean}  [opts.detached] 是否脱离启动窗口独立运行（daemon 模式）
 * @returns {import('node:child_process').ChildProcess}
 */
export function startStaticServer({ port = HALL_PORT, dir = HALL_DIR, logFile = null, detached = false } = {}) {
  const args = [HALL_SCRIPT, '--serve', String(port), dir];
  let stdio = 'inherit';
  if (logFile) {
    const logPath = path.join(ROOT, 'logs', logFile);
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    const fd = fs.openSync(logPath, 'a');
    stdio = ['ignore', fd, fd];
  } else if (detached) {
    // daemon 模式绝不能继承父进程 stdio，否则父进程退出/关窗会连带影响子进程。
    stdio = 'ignore';
  }

  const child = spawn(process.execPath, args, { cwd: ROOT, stdio, detached: !!detached });
  if (detached) child.unref();
  return child;
}

/**
 * 尝试用系统默认浏览器打开 URL。
 *
 * Windows 用 `cmd /c start` 且必须同步（execSync）：异步 spawn 在脚本退出时来不及执行；
 * 沙箱 / CI 环境可能没有浏览器或弹权限，因此失败绝不能抛出，只打印手动访问提示。
 *
 * @param {string} url
 */
export function openBrowser(url) {
  try {
    if (IS_WIN) {
      execSync(`cmd /c start "" "${url}"`, { stdio: 'ignore', windowsHide: true });
    } else if (process.platform === 'darwin') {
      execSync(`open "${url}"`, { stdio: 'ignore' });
    } else {
      execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
    }
    console.log(`已尝试自动打开浏览器: ${url}`);
  } catch {
    console.log(`如未自动打开，请手动访问 ${url}`);
  }
}
