#!/usr/bin/env node
/**
 * gen-catalog.mjs — 将「唯一事实来源」渲染为 docs/APP_CATALOG.md。
 * 生成逻辑见 scripts/lib-catalog.mjs（与校验器共用，避免逻辑分叉）。
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalogText, parseApps } from './lib-catalog.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function main() {
  const apps = parseApps();
  if (!apps.length) {
    console.error('未能从 playwright.config.ts 解析出任何 App');
    process.exit(1);
  }
  const outDir = join(ROOT, 'docs');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'APP_CATALOG.md'), buildCatalogText());
  console.log(`已生成 docs/APP_CATALOG.md（${apps.length} 个 App）`);
}

main();
