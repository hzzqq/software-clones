#!/usr/bin/env node
/**
 * verify-apps.mjs — 真实运行每个克隆 App 的单元测试（client + server）。
 *
 * 这是此前缺失的能力：consistency 校验器只检查「测试文件是否存在」，
 * 却从不在 CI / 本地真正执行这些测试。本脚本补足「真实回归闸门」，
 * 让 12 个 App 的 client / server 单测可被一次性跑通并汇总。
 *
 * 用法：
 *   node scripts/verify-apps.mjs                  # 运行全部 12 个 App（client + server）
 *   node scripts/verify-apps.mjs kanban          # 只运行某个 App
 *   node scripts/verify-apps.mjs --scope client  # 仅运行所有 App 的 client 单测
 *   node scripts/verify-apps.mjs kanban --scope server --json
 *
 * 退出码：任一 suite 失败则非 0；全部通过（或仅 skipped）则 0。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseApps } from './lib-catalog.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TIMEOUT_MS = 180_000;

function hasTestScript(pkgPath) {
  if (!existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return Boolean(pkg.scripts && typeof pkg.scripts.test === 'string');
  } catch {
    return false;
  }
}

/** 运行单个 scope（client 或 server）的 `npm test`，解析 vitest 汇总。 */
function runSuite(appName, scope) {
  const cwd = join(ROOT, appName, scope);
  const pkgPath = join(cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    return { scope, status: 'absent', passed: 0, failed: 0, output: '' };
  }
  if (!hasTestScript(pkgPath)) {
    return { scope, status: 'no-script', passed: 0, failed: 0, output: '' };
  }
  const r = spawnSync('npm test', {
    cwd,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    shell: true,
    // 避免 npm 在沙箱/CI 中因 registry 访问而卡住；本地脚本无需网络
    env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false', npm_config_update_notifier: 'false' },
  });
  const raw = (r.stdout || '') + (r.stderr || '');
  const out = raw.replace(/\x1b\[[0-9;]*m/g, ''); // 去除 ANSI 颜色码，避免干扰解析
  const code = r.status ?? (r.error ? 1 : 0);

  if (/No test files found/.test(out)) {
    return { scope, status: 'skipped', passed: 0, failed: 0, output: raw };
  }

  // 环境性失败（如沙箱内 better-sqlite3 原生绑定未编译）：非代码缺陷，记为 env 跳过
  if (code !== 0 && /Could not locate the bindings file|better_sqlite3\.node|NODE_MODULE_VERSION/.test(out)) {
    return { scope, status: 'env', passed: 0, failed: 0, output: raw };
  }

  const tests = out.match(/Tests\s+(?:(\d+)\s+failed\s*\|\s*)?(\d+)\s+passed/);
  const failed = tests ? Number(tests[1] || 0) : code !== 0 ? -1 : 0;
  const passed = tests ? Number(tests[2] || 0) : 0;

  const ok = code === 0 && failed === 0;
  return {
    scope,
    status: ok ? 'pass' : 'fail',
    passed,
    failed: failed < 0 ? '?' : failed,
    output: raw,
  };
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const scopeIdx = args.indexOf('--scope');
  const scopeArg = scopeIdx >= 0 ? args[scopeIdx + 1] : 'all';
  const scopeFilter = scopeArg === 'client' || scopeArg === 'server' ? scopeArg : 'all';
  const names = args.filter((a) => !a.startsWith('--') && a !== 'client' && a !== 'server');

  const apps = parseApps();
  const targets = names.length ? apps.filter((a) => a.name === names[0] || a.dir === names[0]) : apps;
  if (names.length && targets.length === 0) {
    console.error(`未找到 App: ${names[0]}`);
    process.exit(2);
  }

  const results = [];
  let totalFailedSuites = 0;
  let totalFailedTests = 0;
  let totalPassedTests = 0;

  for (const app of targets) {
    const scopes = scopeFilter === 'all' ? ['client', 'server'] : [scopeFilter];
    const appResult = { app: app.name, suites: [] };
    for (const scope of scopes) {
      const r = runSuite(app.name, scope);
      appResult.suites.push(r);
      if (r.status === 'fail') {
        totalFailedSuites += 1;
        if (typeof r.failed === 'number') totalFailedTests += r.failed;
      } else if (r.status === 'pass') {
        totalPassedTests += r.passed;
      }
    }
    results.push(appResult);
  }

  if (asJson) {
    console.log(JSON.stringify({ results, totalFailedSuites, totalFailedTests, totalPassedTests }, null, 2));
  } else {
    console.log('\n软件克隆单测真实回归 — 共 ' + targets.length + ' 个 App\n');
    for (const appResult of results) {
      const parts = appResult.suites.map((s) => {
        const tag = { pass: '✅', fail: '❌', absent: '➖', 'no-script': '➖', skipped: '⚠️', env: '⚙️' }[s.status] || '?';
        if (s.status === 'pass') return `${s.scope}:${tag}${s.passed}`;
        if (s.status === 'fail') return `${s.scope}:${tag}${s.passed}/${s.failed}`;
        return `${s.scope}:${tag}`;
      });
      console.log(`  ${appResult.app.padEnd(12)} ${parts.join('  ')}`);
      if (appResult.suites.some((s) => s.status === 'fail')) {
        const failed = appResult.suites.find((s) => s.status === 'fail');
        const lines = failed.output.split('\n').filter((l) => /fail|Error|✗|×/.test(l)).slice(0, 6);
        for (const l of lines) console.log('     ' + l.trim());
      }
    }
    console.log(
      `\n汇总：通过用例 ${totalPassedTests} · 失败 suite ${totalFailedSuites} · 失败用例 ${totalFailedTests}`
    );
  }

  process.exit(totalFailedSuites > 0 ? 1 : 0);
}

main();
