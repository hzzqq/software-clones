#!/usr/bin/env node
/**
 * gen-catalog.mjs — 从「唯一事实来源」生成 docs/APP_CATALOG.md。
 *
 * 事实来源：
 *   - playwright.config.ts 的 APPS 数组（name / dir / e2e 端口）
 *   - 每个 App 的 server/.env.example 的 PORT（后端端口）
 *
 * 这样 App 目录、端口、CI 矩阵在仓库里只有一处定义，文档由脚本派生，
 * 配合 check-consistency.mjs 可在 CI 中阻止文档漂移。
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PW = join(ROOT, 'playwright.config.ts');

function parseApps() {
  const text = readFileSync(PW, 'utf8');
  const re = /name:\s*'([^']+)'[\s\S]*?dir:\s*'([^']+)'[\s\S]*?port:\s*(\d+)/g;
  const apps = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    apps.push({ name: m[1], dir: m[2], port: Number(m[3]) });
  }
  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

function serverPort(name) {
  const p = join(ROOT, name, 'server', '.env.example');
  if (!existsSync(p)) return '—';
  const text = readFileSync(p, 'utf8');
  const m = text.match(/PORT\s*=\s*(\d+)/);
  return m ? Number(m[1]) : '—';
}

function main() {
  const apps = parseApps();
  if (!apps.length) {
    console.error('未能从 playwright.config.ts 解析出任何 App');
    process.exit(1);
  }
  const rows = apps
    .map((a) => {
      const sp = serverPort(a.name);
      const hasServer = existsSync(join(ROOT, a.name, 'server', 'package.json'));
      const role = hasServer ? '全栈（前端 + 后端）' : '仅前端';
      return `| \`${a.name}\` | ${role} | ${a.port} | ${sp} | \`${a.dir}\` | \`${a.name}/server\` |`;
    })
    .join('\n');

  const catalog = `# App 目录（自动生成 · 请勿手改）

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

  const outDir = join(ROOT, 'docs');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'APP_CATALOG.md'), catalog);
  console.log(`已生成 docs/APP_CATALOG.md（${apps.length} 个 App）`);
}

main();
