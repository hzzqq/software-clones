#!/usr/bin/env node
/**
 * check-consistency.mjs — 依赖无关的软件克隆单体仓库一致性校验器。
 *
 * 设计目标：在「沙箱无法 npm install / 无法编译 better-sqlite3」的环境下，
 * 仅用 Node 内置模块即可验证仓库不变量，给自主开发循环一个可执行的验收闸门。
 *
 * 校验项（ERROR 会导致退出码 1）：
 *   1. 每个全栈 App（含 client/ 与 server/）必须在 README.md 中被提及（文档漂移防护）。
 *   2. 每个 App 必须在 e2e/<app>/ 下拥有 E2E 冒烟目录。
 *   2b. 每个 App 的 e2e/<app>/ 必须包含至少一份 *.spec.ts 冒烟用例（避免空目录假绿）。
 *   3. 每个 App 的 server 必须存在 .env.example（可复现的启动配置）。
 *   4. 每个 App 必须在 e2e.yml 的 CI 矩阵与 playwright.config.ts 的 APPS 中被登记。
 *
 * 输出人类可读报告，并把结构化结果写入 .workbuddy/self-driving/last-check.json。
 */
import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalogText } from './lib-catalog.mjs';
import { isAppDir, findE2ESpecs } from './consistency-rules.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function listApps() {
  return readdirSync(ROOT).filter((n) => isAppDir(ROOT, n)).sort();
}

function readText(relPath) {
  const p = join(ROOT, relPath);
  if (!existsSync(p)) return null;
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function main() {
  const apps = listApps();
  const readme = readText('README.md') ?? '';
  const e2eYml = readText('.github/workflows/e2e.yml') ?? '';
  const playwright = readText('playwright.config.ts') ?? '';

  const errors = [];
  const warnings = [];
  const perApp = [];

  for (const app of apps) {
    const e2eSpecs = findE2ESpecs(ROOT, app);
    const checks = {
      readme: readme.includes(app),
      e2eDir: existsSync(join(ROOT, 'e2e', app)),
      e2eSpec: e2eSpecs.length > 0,
      envExample: existsSync(join(ROOT, app, 'server', '.env.example')),
      ciMatrix: e2eYml.includes(app),
      playwrightApps: playwright.includes(app),
    };
    if (!checks.readme) errors.push(`[${app}] README.md 未提及该 App（文档漂移）`);
    if (!checks.e2eDir) errors.push(`[${app}] 缺少 e2e/${app}/ 冒烟目录`);
    if (!checks.e2eSpec) errors.push(`[${app}] e2e/${app}/ 下没有任何 *.spec.ts 冒烟用例`);
    if (!checks.envExample) errors.push(`[${app}] server 缺少 .env.example`);
    if (!checks.ciMatrix) warnings.push(`[${app}] e2e.yml CI 矩阵未登记`);
    if (!checks.playwrightApps) warnings.push(`[${app}] playwright.config.ts APPS 未登记`);
    perApp.push({ app, ...checks });
  }

  // 生成物新鲜度：docs/APP_CATALOG.md 必须与事实来源严格一致（防止手改后失真）
  let catalogFresh = false;
  const catalogPath = join(ROOT, 'docs', 'APP_CATALOG.md');
  if (existsSync(catalogPath)) {
    const expected = buildCatalogText();
    const actual = readFileSync(catalogPath, 'utf8');
    catalogFresh = expected.trim() === actual.trim();
  }
  if (!catalogFresh) {
    errors.push('docs/APP_CATALOG.md 与生成结果不一致，请运行 node scripts/gen-catalog.mjs 重新生成');
  }

  // 贡献者入口：CONTRIBUTING.md 必须存在且指引贡献者运行一致性校验器
  const contributing = readText('CONTRIBUTING.md');
  if (!contributing) {
    errors.push('缺少 CONTRIBUTING.md（贡献者入口）');
  } else if (!contributing.includes('check-consistency.mjs')) {
    errors.push('CONTRIBUTING.md 未指引贡献者运行 scripts/check-consistency.mjs');
  }

  // 打印报告
  console.log(`\n软件克隆单体仓库一致性校验 — 共发现 ${apps.length} 个全栈 App\n`);
  for (const row of perApp) {
    const ok = row.readme && row.e2eDir && row.e2eSpec && row.envExample;
    const tag = ok ? 'OK ' : 'FAIL';
    console.log(
      `  [${tag}] ${row.app.padEnd(12)} readme:${row.readme ? '✓' : '✗'} ` +
        `e2e:${row.e2eDir ? '✓' : '✗'} spec:${row.e2eSpec ? '✓' : '✗'} ` +
        `env:${row.envExample ? '✓' : '✗'} ` +
        `ci:${row.ciMatrix ? '✓' : '✗'} pw:${row.playwrightApps ? '✓' : '✗'}`
    );
  }
  console.log(
    `  [${catalogFresh ? 'OK ' : 'FAIL'}] docs/APP_CATALOG.md 新鲜度: ${catalogFresh ? '✓' : '✗'}`
  );

  const summary = {
    ts: new Date().toISOString(),
    apps: apps.length,
    errors: errors.length,
    warnings: warnings.length,
    perApp,
  };
  try {
    const outDir = join(ROOT, '.workbuddy', 'self-driving');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'last-check.json'), JSON.stringify(summary, null, 2));
  } catch {
    /* 报告写入失败不应影响校验结果 */
  }

  console.log(`\n错误: ${errors.length}  警告: ${warnings.length}`);
  if (errors.length) {
    console.log('\n需修复项:');
    for (const e of errors) console.log('  - ' + e);
    console.log('\n校验未通过 (exit 1)');
    process.exit(1);
  }
  if (warnings.length) {
    console.log('\n告警项:');
    for (const w of warnings) console.log('  - ' + w);
  }
  console.log('\n✅ 一致性校验通过 (exit 0)');
}

main();
