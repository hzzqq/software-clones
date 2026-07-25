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
