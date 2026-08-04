#!/usr/bin/env node
/**
 * 查看全部 App 的 daemon 运行状态。
 *
 *   npm run dev:status
 *   node scripts/dev-status.mjs
 *
 * 判定口径：以端口是否 LISTENING 为准（PID 文件只是辅助信息，可能过期）。
 */
import { APPS, readPidFile, isPortListening, HALL_PORT } from './apps.mjs';

const rows = APPS.map((app) => {
  const rec = readPidFile(app.name);
  const clientUp = isPortListening(app.clientPort);
  const serverUp = isPortListening(app.serverPort);
  return {
    app,
    rec,
    serverUp,
    clientUp,
    running: clientUp || serverUp,
  };
});

console.log('APP            状态       后端        前端        访问地址                      启动于');
console.log('─'.repeat(104));

for (const { app, rec, serverUp, clientUp, running } of rows) {
  const state = running ? 'running' : 'stopped';
  const s = `${serverUp ? 'UP  ' : 'DOWN'} :${app.serverPort}`;
  const c = `${clientUp ? 'UP  ' : 'DOWN'} :${app.clientPort}`;
  const url = running ? `http://localhost:${app.clientPort}` : '-';
  const since = rec?.startedAt ?? '-';
  console.log(`${app.name.padEnd(14)} ${state.padEnd(10)} ${s.padEnd(11)} ${c.padEnd(11)} ${url.padEnd(29)} ${since}`);
}

// ── 大厅 ──
const hallRec = readPidFile('hall');
const hallUp = isPortListening(HALL_PORT);
console.log('─'.repeat(104));
const hallState = hallUp ? 'running' : 'stopped';
const hallPort = hallUp ? `UP   :${HALL_PORT}` : 'DOWN';
const hallUrl = hallUp ? `http://localhost:${HALL_PORT}` : '-';
console.log(`${'hall'.padEnd(14)} ${hallState.padEnd(10)} ${'-'.padEnd(11)} ${hallPort.padEnd(11)} ${hallUrl.padEnd(29)} ${hallRec?.startedAt ?? '-'}`);
console.log('─'.repeat(104));

const runningCount = rows.filter((r) => r.running).length;
console.log(`\n运行中 ${runningCount}/${APPS.length} 个 App，大厅 ${hallUp ? '运行中' : '已停止'}。`);
console.log('启动全部: npm run dev:all   |   大厅: npm run dev:hall / npm run stop:hall');
console.log('停止全部: npm run stop:all   |   单个: npm run dev:app -- <app>');

// 有孤儿 PID 文件（端口不通但文件还在）时给个提示
const stale = rows.filter((r) => !r.running && r.rec);
if (stale.length > 0) {
  console.log(`\n提示: ${stale.map((r) => r.app.name).join(', ')} 端口未监听但 PID 文件仍存在，可执行 npm run stop:all 清理。`);
}
