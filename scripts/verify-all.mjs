#!/usr/bin/env node
/**
 * verify-all.mjs — 仓库统一验收入口（零依赖，纯 Node 运行）。
 *
 * 依次执行：
 *   1. 一致性校验（check-consistency.mjs）—— 含目录新鲜度检查
 *   2. 规则单元测试（check-consistency.test.mjs）
 *
 * 任一阶段失败即以非零退出码结束，便于本地与 CI 统一调用：
 *   node scripts/verify-all.mjs
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const steps = [
  { name: '一致性校验', args: ['scripts/check-consistency.mjs'] },
  { name: '规则单元测试', args: ['scripts/check-consistency.test.mjs'] },
];

let failed = 0;
for (const step of steps) {
  console.log(`\n▶ ${step.name}`);
  const r = spawnSync('node', step.args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) {
    failed++;
    console.log(`\n✗ ${step.name} 失败 (exit ${r.status})`);
  } else {
    console.log(`✓ ${step.name} 通过`);
  }
}

if (failed > 0) {
  console.log(`\n❌ 验收未通过：共 ${failed} 项失败`);
  process.exit(1);
}
console.log('\n✅ 全部验收通过');
