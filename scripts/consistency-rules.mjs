#!/usr/bin/env node
/**
 * consistency-rules.mjs — 被 check-consistency.mjs 与单元测试共用的「纯函数」规则库。
 *
 * 设计原则：
 * - 所有函数尽量无副作用，且把 ROOT / 待检测对象作为参数传入，便于在单元测试中用临时目录驱动。
 * - 不在此处执行任何 I/O 编排或退出流程，只做「判断」与「提取」。
 *
 * 当前导出的规则：
 *   - isAppDir(root, name)              判定某顶层目录是否为全栈 App（client+server 均有 package.json）
 *   - findE2ESpecs(root, app)           列出 e2e/<app>/ 下所有 *.spec.ts（冒烟用例必须存在）
 */
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

/** 递归列出目录下所有单元/集成测试源文件（client 端 *.test.ts(x) / *.spec.ts(x)）。 */
function walkTestFiles(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
      walkTestFiles(full, out);
    } else if (/(\.test|\.spec)\.tsx?$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

/** 判定某顶层目录是否为「全栈 App」：同时含 client/package.json 与 server/package.json。 */
export function isAppDir(root, name) {
  if (!name || name.startsWith('.')) return false;
  const full = join(root, name);
  try {
    if (!statSync(full).isDirectory()) return false;
  } catch {
    return false;
  }
  const hasClient = existsSync(join(full, 'client', 'package.json'));
  const hasServer = existsSync(join(full, 'server', 'package.json'));
  return hasClient && hasServer;
}

/** 列出 e2e/<app>/ 目录下所有 *.spec.ts 文件名（不含路径）。空数组表示没有真实用例。 */
export function findE2ESpecs(root, app) {
  const dir = join(root, 'e2e', app);
  if (!existsSync(dir)) return [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.filter((f) => f.endsWith('.spec.ts'));
}

/**
 * 从 playwright.config.ts 文本精确提取 APPS 数组里登记的应用名（取 `name: '...'` 字面量）。
 * 用精确解析替代脆弱的「整文件 includes」——避免应用名作为子串出现在注释/路径中时误判。
 * @returns {string[]} 应用名列表（去重、保留出现顺序）
 */
export function parsePlaywrightApps(text) {
  const block = text.match(/export\s+const\s+APPS[\s\S]*?=\s*\[([\s\S]*?)\]/);
  if (!block) return [];
  const names = block[1].match(/name\s*:\s*['"]([^'"]+)['"]/g) || [];
  const out = [];
  for (const n of names) {
    const m = n.match(/name\s*:\s*['"]([^'"]+)['"]/);
    const name = m ? m[1] : null;
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

/**
 * 从 GitHub Actions 的 e2e.yml 文本精确提取 matrix.app 列表（取 `app:` 键下连续的 `- <slug>` 行）。
 * 同样用精确解析替代整文件 includes，避免子串误判。
 * @returns {string[]} 应用名列表（去重、保留出现顺序）
 */
export function parseYamlMatrixApps(text) {
  const m = text.match(/matrix\s*:[\s\S]*?app\s*:\s*\n((?:\s*-\s*\S+\s*\n)+)/);
  if (!m) return [];
  const out = [];
  for (const line of m[1].match(/-\s*\S+/g) || []) {
    const name = line.replace(/-\s*/, '').trim();
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

/**
 * 检测 Markdown 文档中的「内部相对链接」是否指向不存在的文件（文档链接腐化 / 漂移）。
 * 忽略：绝对 http(s)/mailto、纯锚点(#)、查询串；仅校验相对文件链接（含 ../ ）。
 * @param {string} docText 文档全文
 * @param {string} docDir 文档所在目录的绝对路径（用于解析相对链接）
 * @returns {string[]} 指向不存在文件的链接目标列表（空数组表示全部有效）
 */
export function findBrokenDocLinks(docText, docDir) {
  const re = /\[[^\]]*\]\(([^)]+)\)/g;
  const broken = [];
  let m;
  while ((m = re.exec(docText)) !== null) {
    let target = m[1].trim();
    if (
      !target ||
      target.startsWith('http://') ||
      target.startsWith('https://') ||
      target.startsWith('mailto:') ||
      target.startsWith('#')
    ) {
      continue;
    }
    const hashIdx = target.indexOf('#');
    if (hashIdx >= 0) target = target.slice(0, hashIdx);
    const qIdx = target.indexOf('?');
    if (qIdx >= 0) target = target.slice(0, qIdx);
    if (!target) continue;
    if (!existsSync(resolve(docDir, target))) broken.push(m[1].trim());
  }
  return broken;
}

/**
 * 判定某 App 的 client/package.json 是否声明了 `test` 脚本（应用必须是可验证的，否则 CI 无法回归）。
 * @returns {boolean}
 */
export function hasClientTestScript(root, app) {
  const p = join(root, app, 'client', 'package.json');
  if (!existsSync(p)) return false;
  try {
    const pkg = JSON.parse(readFileSync(p, 'utf8'));
    const test = (pkg.scripts || {}).test;
    return typeof test === 'string' && test.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * 列出某 App client 目录下的单元测试文件（递归，排除 node_modules/dist）。
 * 用于校验「声明了 test 脚本却零用例」的空心安全网。
 * @returns {string[]} 命中文件绝对路径
 */
export function findClientTestFiles(root, app) {
  const dir = join(root, app, 'client');
  if (!existsSync(dir)) return [];
  return walkTestFiles(dir);
}

/**
 * 判定某 App 的 client 是否真正含有单元测试用例文件（不仅是声明了一个 test 脚本）。
 * 防止 CI 矩阵里出现「脚本在但一个用例都没有」的空心回归网。
 * @returns {boolean}
 */
export function hasClientTestFile(root, app) {
  return findClientTestFiles(root, app).length > 0;
}

/**
 * 校验某 App 的 server/.env.example 是否包含运行所必需的关键配置项。
 * 缺失 PORT / CORS_ORIGIN 会导致后端/跨域在真实或 CI 环境无法启动，属于「能 clone 但不能跑」的隐性缺口。
 * @param {string[]} requiredKeys 必须存在的键（形如 `PORT`）
 * @returns {string[]} 缺失的键（空数组表示齐全）
 */
export function missingEnvKeys(root, app, requiredKeys = ['PORT', 'CORS_ORIGIN']) {
  const p = join(root, app, 'server', '.env.example');
  if (!existsSync(p)) return [...requiredKeys];
  let text = '';
  try {
    text = readFileSync(p, 'utf8');
  } catch {
    return [...requiredKeys];
  }
  const missing = [];
  for (const key of requiredKeys) {
    const re = new RegExp(`^\\s*${key}\\s*=`, 'm');
    if (!re.test(text)) missing.push(key);
  }
  return missing;
}

/** 递归收集仓库内所有 Markdown 文档（用于统一做链接腐化检测，避免遗漏未登记文档）。 */
export function findAllMarkdownFiles(root) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(root, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name.startsWith('.')) continue;
      out.push(...findAllMarkdownFiles(full));
    } else if (e.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * 从 playwright.config.ts 文本稳健地解析 APPS 数组，逐个对象提取 name/dir/port。
 * 相比 lib-catalog.mjs 旧实现（要求 name→dir→port 固定顺序、否则整条丢弃导致目录漂移），
 * 本解析器对每个 `{...}` 对象独立抽取字段，对字段顺序不敏感。
 * @returns {{name:string,dir:?string,port:?number}[]}
 */
export function parseApps(text) {
  const block = text.match(/export\s+const\s+APPS[\s\S]*?=\s*\[([\s\S]*?)\]/);
  if (!block) return [];
  const objRe = /\{([\s\S]*?)\}/g;
  const apps = [];
  let m;
  while ((m = objRe.exec(block[1])) !== null) {
    const obj = m[1];
    const name = (obj.match(/name\s*:\s*['"]([^'"]+)['"]/) || [])[1];
    if (!name) continue;
    const dir = (obj.match(/dir\s*:\s*['"]([^'"]+)['"]/) || [])[1] ?? null;
    const portM = obj.match(/port\s*:\s*(\d+)/);
    apps.push({ name, dir, port: portM ? Number(portM[1]) : null });
  }
  return apps;
}

/**
 * 找出 APPS 中出现次数 >1 的 port（E2E 前端端口冲突会让并行 Playwright 跑串）。
 * @returns {number[]} 重复的端口
 */
export function findDuplicatePorts(apps) {
  const seen = new Map();
  for (const a of apps) {
    if (a.port == null) continue;
    seen.set(a.port, (seen.get(a.port) || 0) + 1);
  }
  return [...seen.entries()].filter(([, c]) => c > 1).map(([p]) => p);
}

/**
 * 找出 APPS 中出现次数 >1 的 name（重复注册是静默错误）。
 * @returns {string[]} 重复的应用名
 */
export function findDuplicateNames(apps) {
  const seen = new Map();
  for (const a of apps) seen.set(a.name, (seen.get(a.name) || 0) + 1);
  return [...seen.entries()].filter(([, c]) => c > 1).map(([n]) => n);
}

/**
 * 找出 APPS 中出现次数 >1 的 dir（两个 App 共享同一 client 目录会让 E2E webServer/端口绑定冲突）。
 * @returns {string[]} 重复的 dir
 */
export function findDuplicateDirs(apps) {
  const seen = new Map();
  for (const a of apps) {
    if (!a.dir) continue;
    seen.set(a.dir, (seen.get(a.dir) || 0) + 1);
  }
  return [...seen.entries()].filter(([, c]) => c > 1).map(([d]) => d);
}

/**
 * 校验 playwright.config.ts 的 APPS 中登记的每个 `dir` 是否真实存在（相对仓库根）。
 * `dir` 指向不存在的目录意味着 E2E 的 `webServer` 命令 `npm --prefix <dir> run dev`
 * 会直接失败——属于「配置登记但目录被改名/移动/删除」的隐性漂移，此前无任何闸门拦截。
 * @param {{name:string,dir:?string}[]} apps parseApps 的结果
 * @returns {{name:string,dir:string}[]} dir 不存在的条目（空数组表示全部有效）
 */
export function missingAppDirs(root, apps) {
  const out = [];
  for (const a of apps) {
    if (!a.dir) continue;
    if (!existsSync(join(root, a.dir))) out.push({ name: a.name, dir: a.dir });
  }
  return out;
}

/**
 * 反向幽灵注册检测：每个真实存在的全栈 App 都必须登记在注册清单里。
 * 一个新增的 App 若忘记写进 playwright APPS / CI 矩阵，此前只是 WARNING（易被忽略），
 * 现作为 ERROR 强制「目录 ↔ 注册」双向一致，避免 clone 后无法被 CI/E2E 覆盖。
 * @param {string[]} allApps 真实存在的 App 名
 * @param {string[]} registered 注册清单（APPS / CI 矩阵解析结果）
 * @returns {string[]} 已存在但未注册的 App 名
 */
export function findUnregisteredApps(allApps, registered) {
  const reg = new Set(registered);
  return allApps.filter((a) => !reg.has(a));
}

/**
 * 校验某 App 是否具备可构建的脚手架：client 需 tsconfig + vite 配置，server 需 tsconfig。
 * 缺失任意一项意味着该 App 无法在 CI 中编译/启动（「能 clone 但不能 build」的隐性缺口）。
 * @returns {{clientTs:boolean, clientVite:boolean, serverTs:boolean, ok:boolean}}
 */
export function checkBuildConfig(root, app) {
  const c = join(root, app, 'client');
  const s = join(root, app, 'server');
  const res = {
    clientTs: existsSync(join(c, 'tsconfig.json')),
    clientVite: existsSync(join(c, 'vite.config.ts')) || existsSync(join(c, 'vite.config.js')),
    serverTs: existsSync(join(s, 'tsconfig.json')),
  };
  res.ok = res.clientTs && res.clientVite && res.serverTs;
  return res;
}

/**
 * 在「必需配置项存在」(missingEnvKeys) 之上，进一步校验其取值是否合理，
 * 避免 `.env.example` 里 `PORT=abc` / `CORS_ORIGIN=localhost` 这类「键在但值非法」的静默错误——
 * 这种配置 clone 后能骗过存在性检查，却在真实运行时让后端端口无效或 CORS 失效。
 * @returns {string[]} 取值不合法的描述（空数组表示全部有效）
 */
export function invalidEnvValues(root, app) {
  const p = join(root, app, 'server', '.env.example');
  if (!existsSync(p)) return [];
  let text = '';
  try {
    text = readFileSync(p, 'utf8');
  } catch {
    return [];
  }
  const problems = [];
  const portM = text.match(/^\s*PORT\s*=\s*(\S+)/m);
  if (portM) {
    const v = portM[1];
    const n = Number(v);
    if (!/^\d+$/.test(v) || n <= 0 || n >= 65536) {
      problems.push(`PORT=${v} 不是合法的 1-65535 端口`);
    }
  }
  const corsM = text.match(/^\s*CORS_ORIGIN\s*=\s*(\S+)/m);
  if (corsM) {
    const v = corsM[1];
    if (!(v === '*' || /^https?:\/\//.test(v))) {
      problems.push(`CORS_ORIGIN=${v} 不是合法来源（应为 * 或 http(s):// 开头）`);
    }
  }
  return problems;
}

/**
 * 校验某 App 的 client 是否具备 Vite 入口 index.html（缺失则 dev server 无法挂载页面）。
 * 与 checkBuildConfig 互补：后者只查 vite 配置存在，本函数查真正的入口文件。
 * @returns {boolean}
 */
export function hasClientIndexHtml(root, app) {
  return existsSync(join(root, app, 'client', 'index.html'));
}

/**
 * 校验某 App 的 server 是否具备入口 src/index.ts（缺失则后端无法启动）。
 * @returns {boolean}
 */
export function hasServerEntry(root, app) {
  return existsSync(join(root, app, 'server', 'src', 'index.ts'));
}

/**
 * 判定某 App 的 client 是否真正把 ErrorBoundary 接入渲染树。
 * 仅存在 `client/src/components/ErrorBoundary.tsx` 还不够——若没在 `main.tsx` / `App.tsx`
 * 里用它包裹根组件，React 渲染期报错仍会整页崩溃、没有任何兜底，等于「文件在但未接线」的
 * 隐性容错缺口（本仓库 12 个 App 历史上一度全部存在该组件却无一接线）。
 * @returns {boolean}
 */
export function errorBoundaryWired(root, app) {
  const tryRead = (rel) => {
    try {
      return readFileSync(join(root, app, rel), 'utf8');
    } catch {
      return '';
    }
  };
  const main = tryRead('client/src/main.tsx');
  const appFile = tryRead('client/src/App.tsx');
  return /ErrorBoundary/.test(main) || /ErrorBoundary/.test(appFile);
}

/**
 * 判定某 App 是否自带 README.md（放在 <app>/README.md）。
 * 每个 App 是独立可运行的子项目，缺自带 README 会让贡献者不知如何启动该 App，
 * 属于「仓库有总文档、子项目无上手说明」的隐性文档缺口。
 * @returns {boolean}
 */
export function hasAppReadme(root, app) {
  return existsSync(join(root, app, 'README.md'));
}

/** 脚手架模板必需文件清单（用于校验 shared/*-template 未被破坏）。 */
export const SHARED_TEMPLATE_FILES = {
  'backend-template': ['package.json', 'tsconfig.json', 'src/index.ts'],
  'frontend-template': ['package.json', 'vite.config.ts', 'tsconfig.json', 'src/main.tsx', 'src/App.tsx'],
};

/**
 * 校验 shared/ 下的脚手架模板是否完整（缺文件会让新 App 脚手架失效）。
 * @returns {string[]} 缺失的关键文件相对路径（空数组表示完整）
 */
export function missingSharedTemplateFiles(root) {
  const out = [];
  for (const [tpl, files] of Object.entries(SHARED_TEMPLATE_FILES)) {
    for (const f of files) {
      if (!existsSync(join(root, 'shared', tpl, f))) out.push(`shared/${tpl}/${f}`);
    }
  }
  return out;
}

/**
 * 校验仓库根是否包含 LICENSE 文件（开源克隆仓库的合规与再分发前置）。
 * 缺失 LICENSE 会让 clone 者在法律上无法安全再分发 / 使用，属于「能 clone 但不能合规使用」的隐性缺口。
 * @returns {boolean}
 */
export function hasLicenseFile(root) {
  return existsSync(join(root, 'LICENSE'));
}

/**
 * 校验根 .gitignore 是否覆盖了「不应被提交」的典型产物：依赖目录、构建产物、密钥文件、本地覆盖与 TS 增量编译产物。
 * 缺失这些忽略项会让巨型 node_modules / 构建产物 / .env 密钥被意外提交，污染仓库甚至泄露凭证。
 * @returns {string[]} 缺失的忽略模式（空数组表示齐全）
 */
export function gitignoreCoversArtifacts(root) {
  const p = join(root, '.gitignore');
  if (!existsSync(p)) return ['node_modules/', 'dist/', '.env', '.env.local', '*.local', '*.tsbuildinfo'];
  let text = '';
  try {
    text = readFileSync(p, 'utf8');
  } catch {
    return ['node_modules/', 'dist/', '.env', '.env.local', '*.local', '*.tsbuildinfo'];
  }
  const required = ['node_modules/', 'dist/', '.env', '.env.local', '*.local', '*.tsbuildinfo'];
  return required.filter((pat) => !text.includes(pat));
}

/**
 * 校验仓库根是否锁定 Node 版本（存在 .nvmrc）。
 * 缺省版本锁会让贡献者 / CI 使用不同 Node 主版本，导致构建与依赖行为漂移（不可复现的隐性风险）。
 * 返回 boolean：存在 .nvmrc 为 true。
 */
export function hasNvmrc(root) {
  return existsSync(join(root, '.nvmrc'));
}

/**
 * 校验某 App 的 client `test` 脚本是否真正调用了 vitest（而非 `echo ok` 之类的空心替身）。
 * 仅声明 test 脚本还不够——若脚本不跑真实测试运行器，「CI 跑过 test」就是假绿。
 * @returns {boolean}
 */
export function clientTestUsesVitest(root, app) {
  const p = join(root, app, 'client', 'package.json');
  if (!existsSync(p)) return false;
  try {
    const pkg = JSON.parse(readFileSync(p, 'utf8'));
    const test = (pkg.scripts || {}).test;
    return typeof test === 'string' && /\bvitest\b/.test(test);
  } catch {
    return false;
  }
}

/**
 * 校验根 README.md 是否向贡献者说明了统一验收命令 `npm test`（仓库级验收红线）。
 * 缺失该说明会让贡献者不知如何本地复验，等于「有门禁却没文档」的隐性缺口。
 * @returns {boolean}
 */
export function readmeMentionsVerify(root) {
  const p = join(root, 'README.md');
  if (!existsSync(p)) return false;
  try {
    return /npm\s+test/.test(readFileSync(p, 'utf8'));
  } catch {
    return false;
  }
}

/**
 * 校验某 App 的自带 README.md 是否包含「如何运行 / 如何验证」的入门说明：
 * 必须出现 `npm install`（启动依赖）与统一验收命令 `npm test`（仓库级红线）。
 * 仅存在 README 还不够——若没写清启动与验证命令，贡献者仍不知如何单独跑起该 App，
 * 更不知有仓库级统一验收红线。
 * @returns {boolean}
 */
export function appReadmeMentionsRun(root, app) {
  const p = join(root, app, 'README.md');
  if (!existsSync(p)) return false;
  try {
    const t = readFileSync(p, 'utf8');
    return /npm\s+install/.test(t) && /npm\s+test/.test(t);
  } catch {
    return false;
  }
}

/**
 * 校验仓库是否提供本地 Git pre-commit 钩子（.githooks/pre-commit）。
 * 此前所有质量闸门只在 CI 运行——贡献者本地提交时无任何强制拦截，
 * 易把不满足一致性的代码推到远端才在 CI 爆红（反馈滞后、修复成本高）。
 * 本规则要求钩子文件存在且真正调用一致性校验器与规则单测，把 CI 闸门下沉到本地提交前。
 * @returns {string[]} 问题列表（空数组表示达标）
 */
export function hasGitHook(root) {
  const p = join(root, '.githooks', 'pre-commit');
  if (!existsSync(p)) return ['.githooks/pre-commit 缺失（未提供本地提交前质量闸门）'];
  let text = '';
  try {
    text = readFileSync(p, 'utf8');
  } catch {
    return ['.githooks/pre-commit 无法读取'];
  }
  const problems = [];
  if (!/check-consistency\.mjs/.test(text)) {
    problems.push('.githooks/pre-commit 未调用 scripts/check-consistency.mjs（本地闸门形同虚设）');
  }
  if (!/check-consistency\.test\.mjs/.test(text)) {
    problems.push('.githooks/pre-commit 未运行规则单元测试（规则回归无法本地拦截）');
  }
  return problems;
}

/**
 * 校验 CI 是否真正执行了 App 单测（防止「unit-tests 闸门被悄悄删掉」的隐性漂移）。
 * 仓库此前只有结构一致性校验，CI 从不执行 12 个 App 的单测，真实回归会被放过。
 * 本规则要求 e2e.yml 同时存在 `unit-tests:` 作业且引用真实单测编排器 `verify-apps.mjs`，
 * 一旦该闸门被误删或改坏，校验器立即报错，避免「以为有门禁、其实没有」的假安全感。
 * @returns {string[]} 问题列表（空数组表示达标）
 */
export function ciRunsUnitTests(root) {
  const p = join(root, '.github', 'workflows', 'e2e.yml');
  if (!existsSync(p)) return ['.github/workflows/e2e.yml 缺失'];
  let text = '';
  try {
    text = readFileSync(p, 'utf8');
  } catch {
    return ['.github/workflows/e2e.yml 无法读取'];
  }
  const problems = [];
  if (!/^\s{2}unit-tests\s*:/m.test(text)) {
    problems.push('e2e.yml 缺少 unit-tests 作业（未门禁 App 单测）');
  }
  if (!/verify-apps\.mjs/.test(text)) {
    problems.push('e2e.yml 未引用 scripts/verify-apps.mjs 单测编排器');
  }
  return problems;
}

/**
 * 检测 App 源码中疑似硬编码密钥/凭据的赋值（纵深防御，防止密钥被提交泄露）。
 *
 * 仅匹配明确的赋值形态：秘密名(apiKey/secret/password/token 等)紧接 : 或 = 后跟一个引号字符串字面量，
 * 且字面量长度 >= 12、不是占位符(your-/changeme/example 等)、不是路径(含斜杠)、不是环境变量/模板
 * (process.env / 美元括号)。这样可避开 type="password"、注册表 key: 'password'、import 路径等误报。
 *
 * 扫描范围：每个全栈 App 的 client/src、server/src(排除 node_modules/dist/点前缀目录与 *.test/*.spec)。
 * @returns {string[]} 形如 app/client/src/file.ts:行号 的问题清单(空数组表示达标)
 */
const SECRET_ASSIGN = /(api[_-]?key|apikey|secret|access[_-]?token|auth[_-]?token|private[_-]?key|client[_-]?secret|password|passwd|pwd)\s*[:=]\s*(['"])(?!\$\{)([^'"]{12,})\2/gi;
const SECRET_PLACEHOLDER = /^(your[-_]?|changeme|change-me|placeholder|example|sample|dummy|test|xxxx|fake|demo|<|process\.env|import\.meta|https?:)/i;

function walkForSecrets(dir, root, app, side, problems) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
      walkForSecrets(full, root, app, side, problems);
    } else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name)) {
      let text;
      try {
        text = readFileSync(full, 'utf8');
      } catch {
        continue;
      }
      const rel = relative(root, full);
      text.split('\n').forEach((line, idx) => {
        let m;
        SECRET_ASSIGN.lastIndex = 0;
        while ((m = SECRET_ASSIGN.exec(line))) {
          const val = m[3];
          if (val.includes('/') || SECRET_PLACEHOLDER.test(val)) continue;
          problems.push(`${app}/${side}/${rel}:${idx + 1}`);
        }
      });
    }
  }
}

export function noHardcodedSecrets(root) {
  const problems = [];
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return problems;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (!isAppDir(root, e.name)) continue;
    for (const side of ['client/src', 'server/src']) {
      const dir = join(root, e.name, side);
      if (existsSync(dir)) walkForSecrets(dir, root, e.name, side, problems);
    }
  }
  return problems;
}

/**
 * 校验某 App 的 API 客户端是否对「网络层失败」做了结构化兜底。
 * 此前 `request()` 直接 `await fetch(...)`，断网 / CORS / 服务宕机时 fetch 抛裸 TypeError，
 * 逃逸为未处理 Promise 拒绝——调用方即便 try/catch 也只能捕获 ApiError，拿不到网络失败，
 * 最终表现为静默失败或无兜底的白屏。本规则要求客户端在 fetch 外包裹 try/catch，
 * 并在失败时 throw 结构化的 `ApiError(50001, '网络请求失败…', 0)`，与既有的 50000(响应非 JSON) 形成体系化错误码。
 * @param {string} clientRel 客户端入口相对 app 根的路径（默认 client/src/api/client.ts；脚手架模板传 src/api/client.ts）
 * @returns {string[]} 问题列表（空数组表示达标）
 */
export function apiClientGuardsNetworkError(
  root,
  app,
  clientRel = join('client', 'src', 'api', 'client.ts')
) {
  const p = join(root, app, clientRel);
  if (!existsSync(p)) return [`缺少 ${clientRel}（无法校验网络错误兜底）`];
  let text = '';
  try {
    text = readFileSync(p, 'utf8');
  } catch {
    return [`${clientRel} 无法读取`];
  }
  if (!/ApiError\(\s*50001/.test(text)) {
    return [`${clientRel} 未对 fetch 网络错误兜底（应 throw ApiError(50001, …)）`];
  }
  return [];
}
