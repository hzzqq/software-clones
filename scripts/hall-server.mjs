#!/usr/bin/env node
/**
 * 大厅静态服务器（零依赖，node 原生 http）。
 *
 * 只负责静态托管 hall/ 目录（端口 5192），**不**负责启动 12 个 App ——
 * 那仍是 dev:all 的活，大厅只是展示与跳转。
 *
 * 三种运行方式：
 *   node scripts/hall-server.mjs                        # daemon：后台 detached 拉起，脚本立即退出
 *   node scripts/hall-server.mjs --foreground           # 前台：阻塞运行，Ctrl+C 停止
 *   node scripts/hall-server.mjs --serve <port> <dir>   # 内部模式：被 startStaticServer 以子进程拉起
 *
 * daemon 模式产物：
 *   PID 记录  scripts/.pids/hall.json
 *   日志      logs/hall.log
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  HALL_PORT,
  HALL_DIR,
  PIDS_DIR,
  startStaticServer,
  isPortListening,
  waitForHttp,
} from './apps.mjs';

const SELF = fileURLToPath(import.meta.url);
const HALL_PID_FILE = path.join(PIDS_DIR, 'hall.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * 路径归一化 + 防 `../` 越权。返回 null 表示非法请求。
 * @param {string} rootDir  允许访问的根目录（绝对路径）
 * @param {string} urlPath  请求路径（含可能的 query）
 * @returns {string|null} 归一化后的绝对路径
 */
function resolveSafe(rootDir, urlPath) {
  try {
    const decoded = decodeURIComponent(urlPath.split('?')[0]);
    const filePath = path.normalize(path.join(rootDir, decoded));
    const rel = path.relative(rootDir, filePath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
    return filePath;
  } catch {
    return null; // decodeURIComponent 抛错（非法 % 序列）一律拒绝
  }
}

/** 构造静态文件请求处理器。 */
function createHandler(rootDir) {
  return (req, res) => {
    const filePath = resolveSafe(rootDir, req.url ?? '/');
    if (!filePath) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }

    let target = filePath;
    try {
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        target = path.join(target, 'index.html');
      }
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
      return;
    }

    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(target).pipe(res);
  };
}

/**
 * 前台运行静态服务器：阻塞在事件循环上直到进程被终止。
 * @param {object}   [opts]
 * @param {number}   [opts.port] 监听端口
 * @param {string}   [opts.dir]  静态文件根目录
 */
export function runForeground({ port = HALL_PORT, dir = HALL_DIR } = {}) {
  const server = http.createServer(createHandler(dir));
  server.on('error', (err) => {
    console.error(`大厅服务器启动失败: ${err.message}`);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(`🏠 软件克隆大厅已启动: http://localhost:${port}/`);
    console.log('（大厅仅静态托管，App 需另行启动，如 npm run dev:all）');
    console.log('按 Ctrl+C 停止。');
  });
}

/**
 * 拉起大厅 daemon（幂等）：已在运行则跳过，不重复 spawn。
 * @returns {Promise<{started:boolean, ok:boolean, pid:number|null}>}
 */
export async function ensureHallDaemon() {
  if (isPortListening(HALL_PORT)) {
    console.log(`[hall] 已在运行  http://localhost:${HALL_PORT}`);
    return { started: false, ok: true, pid: null };
  }

  const child = startStaticServer({ port: HALL_PORT, dir: HALL_DIR, logFile: 'hall.log', detached: true });
  fs.mkdirSync(PIDS_DIR, { recursive: true });
  fs.writeFileSync(
    HALL_PID_FILE,
    `${JSON.stringify({ pid: child.pid ?? null, port: HALL_PORT, startedAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8',
  );
  console.log(`[hall] 正在后台启动（pid=${child.pid}），等待就绪…`);

  const ok = await waitForHttp(HALL_PORT, 15_000);
  if (!ok) console.log('[hall] 启动异常，请查看 logs/hall.log');
  return { started: true, ok, pid: child.pid ?? null };
}

// ── CLI 入口（被其它脚本 import 时不执行）──
const isCli = process.argv[1] && path.basename(process.argv[1]) === 'hall-server.mjs';

if (isCli) {
  const argv = process.argv.slice(2);
  const serveIdx = argv.indexOf('--serve');
  if (serveIdx >= 0) {
    // 内部模式：被 startStaticServer 以子进程拉起，直接跑服务器
    const port = Number(argv[serveIdx + 1] ?? HALL_PORT);
    const dir = argv[serveIdx + 2] ? path.resolve(argv[serveIdx + 2]) : HALL_DIR;
    runForeground({ port, dir });
  } else if (argv.includes('--foreground')) {
    runForeground({ port: HALL_PORT, dir: HALL_DIR });
  } else {
    // 默认 daemon：把自己 detached 拉起来再退出（幂等）
    await ensureHallDaemon();
    console.log(`大厅地址: http://localhost:${HALL_PORT}/`);
    process.exit(0);
  }
}
