#!/usr/bin/env node
/**
 * 停止全部 daemon 模式启动的 App。
 *
 *   npm run stop:all
 *   node scripts/stop-all.mjs
 */
import { APPS } from './apps.mjs';
import { stopApp } from './stop-app.mjs';

console.log(`正在停止 ${APPS.length} 个应用…\n`);

const results = APPS.map((app) => stopApp(app));

console.log('APP            结果');
console.log('─'.repeat(40));
for (const r of results) {
  let label = '未运行';
  if (r.wasRunning) label = r.stopped ? '已停止' : '停止失败（端口仍占用）';
  console.log(`${r.name.padEnd(14)} ${label}`);
}

const failed = results.filter((r) => r.wasRunning && !r.stopped);
const stopped = results.filter((r) => r.wasRunning && r.stopped);
console.log(`\n已停止 ${stopped.length} 个，失败 ${failed.length} 个，PID 文件已清理。`);
process.exit(failed.length === 0 ? 0 : 1);
