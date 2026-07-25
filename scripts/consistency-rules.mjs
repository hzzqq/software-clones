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
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

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
