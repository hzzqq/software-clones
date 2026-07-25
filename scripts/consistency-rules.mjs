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
import { join, dirname, resolve } from 'node:path';

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
