import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { E2E_APPS } from './apps.config';

/**
 * 全局前置：按端口分配拉起全部 12 个后端（better-sqlite3 v13 自带预编译二进制，现已可运行），
 * 等待每个 /api/health 就绪后再让测试项目开始。进程在 globalTeardown 中按端口清理。
 *
 * 关键点：
 * - Windows 下 npm 实际是 npm.cmd，spawn 必须走 shell，否则直接 ENOENT。
 * - 每个 app 用独立的临时 DB（DB_PATH → os.tmpdir()），E2E 绝不污染开发库。
 * - 后端日志落到临时目录，健康检查失败时能直接看到原因。
 */

export const E2E_TMP_DIR = path.join(os.tmpdir(), 'software-clones-e2e');

function waitForHealth(port: number, timeoutMs = 60000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = (): void => {
      const req = http.get(
        { host: '127.0.0.1', port, path: '/api/health', timeout: 2000 },
        (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) resolve();
          else retry(new Error(`status ${res.statusCode}`));
        },
      );
      req.on('error', (err) => retry(err));
      req.on('timeout', () => req.destroy());
    };
    const retry = (err: Error): void => {
      if (Date.now() > deadline) {
        reject(new Error(`server on port ${port} not healthy in time: ${err.message}`));
      } else {
        setTimeout(tick, 400);
      }
    };
    tick();
  });
}

export default async function globalSetup(): Promise<void> {
  fs.mkdirSync(E2E_TMP_DIR, { recursive: true });

  for (const app of E2E_APPS) {
    const logPath = path.join(E2E_TMP_DIR, `${app.name}-server.log`);
    const logFd = fs.openSync(logPath, 'w');
    spawn('npm', ['--prefix', app.serverDir, 'run', 'dev'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(app.serverPort),
        CORS_ORIGIN: '*',
        DB_PATH: path.join(E2E_TMP_DIR, `${app.name}.db`),
        NODE_ENV: 'test',
      },
      stdio: ['ignore', logFd, logFd],
      shell: process.platform === 'win32',
      detached: false,
    });
  }

  for (const app of E2E_APPS) {
    try {
      await waitForHealth(app.serverPort);
    } catch (err) {
      const logPath = path.join(E2E_TMP_DIR, `${app.name}-server.log`);
      const tail = fs.existsSync(logPath)
        ? fs.readFileSync(logPath, 'utf8').split('\n').slice(-15).join('\n')
        : '(无日志)';
      throw new Error(`[${app.name}] 后端未就绪：${(err as Error).message}\n--- 日志尾部 ---\n${tail}`);
    }
  }
}
