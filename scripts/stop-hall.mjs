#!/usr/bin/env node
/**
 * 停止大厅（daemon 模式启动的 hall-server）。
 *
 *   npm run stop:hall
 *   node scripts/stop-hall.mjs
 *
 * 双保险：先按 PID 文件里记录的 pid 杀进程树，再按端口 5192 兜底。
 */
import { HALL_PORT, killTree, killByPort, readPidFile, removePidFile, isPortListening } from './apps.mjs';

const wasRunning = isPortListening(HALL_PORT);
const rec = readPidFile('hall');

if (rec && rec.pid) killTree(rec.pid);
killByPort(HALL_PORT);
removePidFile('hall');

const stopped = !isPortListening(HALL_PORT);

if (!wasRunning) {
  console.log('[hall] 本来就没在运行（PID 文件已清理）。');
} else if (stopped) {
  console.log(`[hall] 已停止  端口 :${HALL_PORT} 已释放`);
} else {
  console.log(`[hall] 停止失败：端口 :${HALL_PORT} 仍被占用，请手动检查 netstat -ano | findstr :${HALL_PORT}`);
  process.exit(1);
}
process.exit(0);
