#!/usr/bin/env node
/**
 * 只拉起大厅（默认 daemon 模式）：启动/复用 hall-server，自动打开浏览器并打印地址。
 *
 *   npm run dev:hall                    # daemon：脚本立即退出，关窗不影响
 *   npm run dev:hall -- --foreground    # 前台：日志透传终端，Ctrl+C 停止
 *   npm run stop:hall                   # 停止
 *
 * 复用 hall-server.mjs 的启动函数（ensureHallDaemon / runForeground）。
 */
import { HALL_PORT, isPortListening, waitForHttp, openBrowser } from './apps.mjs';
import { ensureHallDaemon, runForeground } from './hall-server.mjs';

const argv = process.argv.slice(2);
const foreground = argv.includes('--foreground');

if (foreground) {
  // ── 前台模式：日志透传当前终端 ──
  if (isPortListening(HALL_PORT)) {
    console.log(`[hall] 已在运行  http://localhost:${HALL_PORT}`);
    openBrowser(`http://localhost:${HALL_PORT}/`);
    process.exit(0);
  }
  runForeground({ port: HALL_PORT });
  await waitForHttp(HALL_PORT, 10_000);
  openBrowser(`http://localhost:${HALL_PORT}/`);
  console.log(`大厅地址: http://localhost:${HALL_PORT}/`);
  // 保持前台
  setInterval(() => {}, 1 << 30);
} else {
  // ── daemon 模式（幂等）──
  const r = await ensureHallDaemon();
  console.log(`大厅: ${r.ok ? '已就绪' : '启动异常'}  http://localhost:${HALL_PORT}/`);
  console.log('停止: npm run stop:hall');
  if (r.ok) openBrowser(`http://localhost:${HALL_PORT}/`);
  process.exit(r.ok ? 0 : 1);
}
