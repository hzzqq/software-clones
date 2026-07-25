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
import { isAppDir, findE2ESpecs, parsePlaywrightApps, parseYamlMatrixApps, findBrokenDocLinks, hasClientTestScript, hasClientTestFile, missingEnvKeys, findAllMarkdownFiles, parseApps, findDuplicatePorts, findDuplicateNames, findDuplicateDirs, checkBuildConfig, missingSharedTemplateFiles, missingAppDirs, findUnregisteredApps, invalidEnvValues, hasClientIndexHtml, hasServerEntry, errorBoundaryWired, hasAppReadme, ciRunsUnitTests } from './consistency-rules.mjs';

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
  // --app <name>：聚焦模式，只校验指定 App（贡献者改一个 App 时快速反馈，不必扫描全部 12 个）
  const appIdx = process.argv.indexOf('--app');
  const appFilter = appIdx !== -1 ? process.argv[appIdx + 1] : null;
  const allApps = listApps();
  const apps = appFilter ? allApps.filter((a) => a === appFilter) : allApps;

  const readme = readText('README.md') ?? '';
  const e2eYml = readText('.github/workflows/e2e.yml') ?? '';
  const playwright = readText('playwright.config.ts') ?? '';

  const errors = [];
  const warnings = [];
  const perApp = [];
  const jsonMode = process.argv.includes('--json'); // 提前声明，避免 --fix 分支在 TDZ 中引用

  if (appFilter && !allApps.includes(appFilter)) {
    errors.push(`[--app] 未知 App "${appFilter}"（可用： ${allApps.join(', ')}）`);
  }

  // 精确解析注册清单（替代脆弱的整文件 includes），用于双向一致性比对
  const registeredPw = parsePlaywrightApps(playwright);
  const registeredYml = parseYamlMatrixApps(e2eYml);
  const appSet = new Set(allApps); // 跨 App 一致性校验始终基于全量 App 列表（聚焦模式不应误伤其它 App）

  for (const app of apps) {
    const e2eSpecs = findE2ESpecs(ROOT, app);
    const checks = {
      readme: readme.includes(app),
      e2eDir: existsSync(join(ROOT, 'e2e', app)),
      e2eSpec: e2eSpecs.length > 0,
      envExample: existsSync(join(ROOT, app, 'server', '.env.example')),
      ciMatrix: registeredYml.includes(app),
      playwrightApps: registeredPw.includes(app),
      clientTest: hasClientTestScript(ROOT, app),
      clientTestFile: hasClientTestFile(ROOT, app),
      build: checkBuildConfig(ROOT, app).ok,
      clientEntry: hasClientIndexHtml(ROOT, app),
      serverEntry: hasServerEntry(ROOT, app),
      errorBoundary: errorBoundaryWired(ROOT, app),
      appReadme: hasAppReadme(ROOT, app),
    };
    if (!checks.readme) errors.push(`[${app}] README.md 未提及该 App（文档漂移）`);
    if (!checks.e2eDir) errors.push(`[${app}] 缺少 e2e/${app}/ 冒烟目录`);
    if (!checks.e2eSpec) errors.push(`[${app}] e2e/${app}/ 下没有任何 *.spec.ts 冒烟用例`);
    if (!checks.envExample) errors.push(`[${app}] server 缺少 .env.example`);
    if (!checks.clientTest) errors.push(`[${app}] client/package.json 未声明 test 脚本（无法回归验证）`);
    if (checks.clientTest && !checks.clientTestFile) errors.push(`[${app}] client 声明了 test 脚本却没有单元测试用例文件（空心安全网）`);
    const missingKeys = missingEnvKeys(ROOT, app);
    if (missingKeys.length) errors.push(`[${app}] server/.env.example 缺少必需配置项: ${missingKeys.join(', ')}`);
    const envProblems = invalidEnvValues(ROOT, app);
    for (const pr of envProblems) errors.push(`[${app}] server/.env.example 配置非法: ${pr}`);
    if (!checks.build) errors.push(`[${app}] 构建脚手架不全（client 需 tsconfig+vite 配置，server 需 tsconfig）`);
    if (!checks.clientEntry) errors.push(`[${app}] client 缺少 index.html 入口（Vite 无法挂载页面）`);
    if (!checks.serverEntry) errors.push(`[${app}] server 缺少 src/index.ts 入口（后端无法启动）`);
    if (!checks.errorBoundary) errors.push(`[${app}] client 未把 ErrorBoundary 接入渲染树（渲染报错将整页崩溃、无兜底）`);
    if (!checks.appReadme) errors.push(`[${app}] 缺少 <app>/README.md（子项目无上手说明）`);
    perApp.push({ app, ...checks });
  }

  // 反向防护：配置里登记了但仓库里没有对应 App 目录（幽灵注册），会导致 CI/编排失败
  for (const name of registeredPw) {
    if (!appSet.has(name)) errors.push(`[ghost] playwright.config.ts APPS 登记了不存在的 App "${name}"`);
  }
  for (const name of registeredYml) {
    if (!appSet.has(name)) errors.push(`[ghost] e2e.yml CI 矩阵登记了不存在的 App "${name}"`);
  }

  // 反向幽灵检测：真实存在的 App 必须登记在 APPS 与 CI 矩阵（目录 ↔ 注册 双向一致）
  for (const name of allApps) {
    if (!registeredPw.includes(name)) errors.push(`[ghost] 真实 App "${name}" 未登记在 playwright.config.ts APPS`);
    if (!registeredYml.includes(name)) errors.push(`[ghost] 真实 App "${name}" 未登记在 e2e.yml CI 矩阵`);
  }

  // 配置内部一致性：APPS 的端口/名称不可重复（否则并行 Playwright 跑串或注册静默冲突）
  const pwApps = parseApps(playwright);
  const dupPorts = findDuplicatePorts(pwApps);
  const dupNames = findDuplicateNames(pwApps);
  if (dupPorts.length) errors.push(`[playwright] APPS 存在重复 E2E 端口: ${dupPorts.join(', ')}`);
  if (dupNames.length) errors.push(`[playwright] APPS 存在重复应用名: ${dupNames.join(', ')}`);
  const dupDirs = findDuplicateDirs(pwApps);
  if (dupDirs.length) errors.push(`[playwright] APPS 存在重复 client 目录(dir): ${dupDirs.join(', ')}`);

  // 配置内部一致性：APPS 登记的 dir 必须真实存在，否则 E2E webServer 命令会失败
  const missingDirs = missingAppDirs(ROOT, pwApps);
  for (const m of missingDirs) {
    errors.push(`[playwright] APPS 登记的 dir "${m.dir}" 不存在（App "${m.name}" 的 E2E webServer 将失败）`);
  }

  // 脚手架完整性：shared/*-template 必需文件不可缺失，否则新 App 骨架会失效
  const missingShared = missingSharedTemplateFiles(ROOT);
  for (const f of missingShared) {
    errors.push(`[shared] 脚手架模板关键文件缺失: ${f}`);
  }

  // CI 必须真正执行 App 单测：防止 unit-tests 闸门被悄悄删除后出现「以为有门禁、其实没有」的假安全感
  for (const pr of ciRunsUnitTests(ROOT)) {
    errors.push(`[ci] ${pr}`);
  }

  // 文档内部链接腐化检测：递归扫描仓库内所有 Markdown，本地相对链接必须指向真实文件
  const allMd = findAllMarkdownFiles(ROOT);
  for (const abs of allMd) {
    const text = readText(abs);
    if (!text) continue;
    const broken = findBrokenDocLinks(text, dirname(abs));
    for (const b of broken) {
      errors.push(`[${abs}] 内部链接指向不存在的文件: ${b}`);
    }
  }

  // 生成物新鲜度：docs/APP_CATALOG.md 必须与事实来源严格一致（防止手改后失真）
  let catalogFresh = false;
  const catalogPath = join(ROOT, 'docs', 'APP_CATALOG.md');
  if (existsSync(catalogPath)) {
    const expected = buildCatalogText();
    const actual = readFileSync(catalogPath, 'utf8');
    catalogFresh = expected.trim() === actual.trim();
    // --fix 模式：目录过期时自动重新生成，免去手动步骤并让 CI 自修复
    if (!catalogFresh && process.argv.includes('--fix')) {
      try {
        writeFileSync(catalogPath, expected);
        catalogFresh = true;
        if (!jsonMode) console.log('  ↻ 已自动重新生成 docs/APP_CATALOG.md（--fix）');
      } catch {
        /* 写入失败则在下方照常报错 */
      }
    }
  }
  if (!catalogFresh) {
    errors.push('docs/APP_CATALOG.md 与生成结果不一致，请运行 node scripts/gen-catalog.mjs 重新生成（或 node scripts/check-consistency.mjs --fix 自动修复）');
  }

  // 贡献者入口：CONTRIBUTING.md 必须存在且指引贡献者运行一致性校验器
  const contributing = readText('CONTRIBUTING.md');
  if (!contributing) {
    errors.push('缺少 CONTRIBUTING.md（贡献者入口）');
  } else if (!contributing.includes('check-consistency.mjs')) {
    errors.push('CONTRIBUTING.md 未指引贡献者运行 scripts/check-consistency.mjs');
  }

  // 已执行的校验闸门清单（可观测性：JSON 报告里记录本次到底验了哪些不变量）
  const RULES = [
    'readme-mention', 'e2e-dir', 'e2e-spec', 'env-example', 'env-keys',
    'env-values', 'client-test-script', 'client-test-file', 'build-config',
    'client-entry', 'server-entry', 'error-boundary', 'app-readme', 'apps-dir', 'no-dup-port', 'no-dup-name',
    'no-dup-dir', 'ghost-reg', 'reverse-ghost', 'shared-template', 'doc-links',
    'catalog-fresh', 'contributing', 'ci-runs-unit-tests',
  ];

  const summary = {
    ts: new Date().toISOString(),
    apps: apps.length,
    errors: errors.length,
    warnings: warnings.length,
    rules: RULES,
    rulesRun: RULES.length,
    perApp,
  };
  try {
    const outDir = join(ROOT, '.workbuddy', 'self-driving');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'last-check.json'), JSON.stringify(summary, null, 2));
  } catch {
    /* 报告写入失败不应影响校验结果 */
  }

  if (!jsonMode) {
    console.log(`\n软件克隆单体仓库一致性校验 — 共发现 ${apps.length} 个全栈 App\n`);
    for (const row of perApp) {
      const ok = row.readme && row.e2eDir && row.e2eSpec && row.envExample && row.clientTest && row.clientTestFile && row.build && row.clientEntry && row.serverEntry && row.errorBoundary && row.appReadme;
      const tag = ok ? 'OK ' : 'FAIL';
      console.log(
        `  [${tag}] ${row.app.padEnd(12)} readme:${row.readme ? '✓' : '✗'} ` +
          `e2e:${row.e2eDir ? '✓' : '✗'} spec:${row.e2eSpec ? '✓' : '✗'} ` +
          `env:${row.envExample ? '✓' : '✗'} test:${row.clientTest ? '✓' : '✗'} ` +
          `cases:${row.clientTestFile ? '✓' : '✗'} build:${row.build ? '✓' : '✗'} ` +
          `cidx:${row.clientEntry ? '✓' : '✗'} sidx:${row.serverEntry ? '✓' : '✗'} ` +
          `eb:${row.errorBoundary ? '✓' : '✗'} ` +
          `ard:${row.appReadme ? '✓' : '✗'} ` +
          `ci:${row.ciMatrix ? '✓' : '✗'} pw:${row.playwrightApps ? '✓' : '✗'}`
      );
    }
    console.log(
      `  [${catalogFresh ? 'OK ' : 'FAIL'}] docs/APP_CATALOG.md 新鲜度: ${catalogFresh ? '✓' : '✗'}`
    );
    console.log(
      `  [${missingShared.length === 0 ? 'OK ' : 'FAIL'}] shared 脚手架模板完整性: ${missingShared.length === 0 ? '✓' : '✗'}`
    );
  }

  if (!jsonMode) console.log(`\n错误: ${errors.length}  警告: ${warnings.length}`);
  if (errors.length) {
    if (jsonMode) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log('\n需修复项:');
      for (const e of errors) console.log('  - ' + e);
    }
    console.log('\n校验未通过 (exit 1)');
    process.exit(1);
  }
  if (warnings.length) {
    console.log('\n告警项:');
    for (const w of warnings) console.log('  - ' + w);
  }
  if (jsonMode) console.log(JSON.stringify(summary, null, 2));
  else console.log('\n✅ 一致性校验通过 (exit 0)');
}

main();
