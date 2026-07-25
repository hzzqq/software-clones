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
