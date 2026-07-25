#!/usr/bin/env node
/**
 * lib-catalog.mjs — 被 gen-catalog.mjs 与 check-consistency.mjs 共用的目录生成逻辑。
 *
 * 唯一事实来源：
 *   - playwright.config.ts 的 APPS 数组（name / dir / e2e 端口）
 *   - 每个 App 的 server/.env.example 的 PORT（后端端口）
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseApps as parseAppsRaw } from './consistency-rules.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PW = join(ROOT, 'playwright.config.ts');

export function parseApps() {
  const text = readFileSync(PW, 'utf8');
  // 复用 consistency-rules.mjs 的稳健解析器（字段顺序无关），按名称排序保持目录稳定
  return parseAppsRaw(text).sort((a, b) => a.name.localeCompare(b.name));
}

export function serverPort(name) {
  const p = join(ROOT, name, 'server', '.env.example');
  if (!existsSync(p)) return '—';
  const text = readFileSync(p, 'utf8');
  const m = text.match(/PORT\s*=\s*(\d+)/);
  return m ? Number(m[1]) : '—';
}

export function buildCatalogText() {
  const apps = parseApps();
  if (!apps.length) throw new Error('未能从 playwright.config.ts 解析出任何 App');
  const rows = apps
    .map((a) => {
      const sp = serverPort(a.name);
      const hasServer = existsSync(join(ROOT, a.name, 'server', 'package.json'));
      const role = hasServer ? '全栈（前端 + 后端）' : '仅前端';
      return `| \`${a.name}\` | ${role} | ${a.port} | ${sp} | \`${a.dir}\` | \`${a.name}/server\` |`;
    })
    .join('\n');

  return `# App 目录（自动生成 · 请勿手改）

> 本文件由 \`scripts/gen-catalog.mjs\` 从 \`playwright.config.ts\` 与 \`server/.env.example\` 派生。
> 若新增/重命名 App，请修改事实来源后运行 \`node scripts/gen-catalog.mjs\` 重新生成。
> 校验：\`node scripts/check-consistency.mjs\`

共 ${apps.length} 个克隆 App。

| App | 形态 | E2E 前端端口 | 后端端口 | 前端目录 | 后端目录 |
|---|---|---|---|---|---|
${rows}

## 约定
- 前端：Vite + React 18 + TypeScript(strict) + MUI 5 + Tailwind 3
- 后端：Express 4 + TypeScript(strict) + better-sqlite3 + dotenv + cors
- 统一响应信封 \`{ code, message, data }\`（code:0 成功）；JSON \`camelCase\` ↔ DB \`snake_case\`；\`/api\` 前缀。
`;
}
