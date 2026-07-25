#!/usr/bin/env node
/**
 * check-consistency.test.mjs — consistency-rules.mjs 纯函数单元测试（零依赖，纯 Node 运行）。
 *
 * 用 os.tmpdir() 建临时仓库沙盒，构造「有 spec / 无 spec」等场景，断言规则函数行为正确，
 * 保证校验器真正能检测漂移，而非永远绿。
 *
 * 运行：node scripts/check-consistency.test.mjs
 * 退出码：0 通过，1 失败（便于接到 CI）。
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { findE2ESpecs, isAppDir } from './consistency-rules.mjs';

let passed = 0;
let failed = 0;
function assert(name, cond) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
  }
}

const sandbox = join(tmpdir(), `consistency-test-${process.pid}`);
rmSync(sandbox, { recursive: true, force: true });
mkdirSync(join(sandbox, 'e2e', 'demo'), { recursive: true });
mkdirSync(join(sandbox, 'demo', 'client'), { recursive: true });
mkdirSync(join(sandbox, 'demo', 'server'), { recursive: true });
writeFileSync(join(sandbox, 'demo', 'client', 'package.json'), '{}');
writeFileSync(join(sandbox, 'demo', 'server', 'package.json'), '{}');

console.log('consistency-rules 单元测试:');

// isAppDir：全栈目录识别
assert('isAppDir 识别全栈 App', isAppDir(sandbox, 'demo') === true);
assert('isAppDir 忽略 . 开头目录', isAppDir(sandbox, '.git') === false);

// findE2ESpecs：空目录 → 无 spec（应被校验器判为 FAIL）
assert('findE2ESpecs 空目录返回 []', findE2ESpecs(sandbox, 'demo').length === 0);
// 写入真实 spec 后 → 命中
writeFileSync(join(sandbox, 'e2e', 'demo', 'demo.spec.ts'), '// smoke');
const specs = findE2ESpecs(sandbox, 'demo');
assert('findE2ESpecs 命中 *.spec.ts', specs.length === 1 && specs[0] === 'demo.spec.ts');
// 非 spec 文件不计
writeFileSync(join(sandbox, 'e2e', 'demo', 'helper.ts'), '// not a spec');
assert('findE2ESpecs 忽略非 .spec.ts', findE2ESpecs(sandbox, 'demo').length === 1);
// 缺失目录返回 []
assert('findE2ESpecs 缺失目录返回 []', findE2ESpecs(sandbox, 'nope').length === 0);

rmSync(sandbox, { recursive: true, force: true });

console.log(`\n通过: ${passed}  失败: ${failed}`);
if (failed > 0) {
  console.log('单元测试未通过 (exit 1)');
  process.exit(1);
}
console.log('✅ 单元测试全部通过 (exit 0)');
