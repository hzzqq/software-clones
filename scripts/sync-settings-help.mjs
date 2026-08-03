#!/usr/bin/env node
/**
 * 把 `_shared/settings-help/**` 同步到 12 个 App 的
 * `<app>/client/src/components/SettingsHelp/`。
 *
 * 特性：
 *  - 幂等：重复运行结果一致（内容相同则跳过写入，仅报告）；
 *  - 递归：自动处理 hooks/ 等子目录；
 *  - 只处理 .ts / .tsx，避免误同步临时文件。
 *
 * 用法：
 *   node scripts/sync-settings-help.mjs            # 同步全部 App
 *   node scripts/sync-settings-help.mjs --check    # 只校验差异，不写入（CI 用）
 *   node scripts/sync-settings-help.mjs markdown   # 只同步指定 App
 */
import { readdir, readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(REPO_ROOT, '_shared', 'settings-help');
const TARGET_SUBPATH = path.join('client', 'src', 'components', 'SettingsHelp');

/** 需要同步的 12 个 App 目录名。 */
export const APPS = [
  'markdown',
  'apiclient',
  'tvtime',
  'excalidraw',
  'photopea',
  'it-tools',
  'kanban',
  'glance',
  'kener',
  'memos',
  'lofi',
  'nonio',
];

/** 允许同步的文件扩展名。 */
const ALLOWED_EXT = new Set(['.ts', '.tsx']);

/**
 * 递归收集源目录下所有待同步文件的相对路径。
 *
 * @param {string} dir 当前遍历目录的绝对路径
 * @param {string} base 相对于 SOURCE_DIR 的前缀
 * @returns {Promise<string[]>} 相对路径数组（使用平台分隔符）
 */
async function collectFiles(dir, base = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  /** @type {string[]} */
  const files = [];
  for (const entry of entries) {
    const relative = path.join(base, entry.name);
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolute, relative)));
    } else if (ALLOWED_EXT.has(path.extname(entry.name))) {
      files.push(relative);
    }
  }
  return files.sort();
}

/**
 * 读取文件内容；不存在时返回 null。
 *
 * @param {string} filePath 绝对路径
 * @returns {Promise<string|null>}
 */
async function readIfExists(filePath) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      return null;
    }
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

/** 脚本主流程。 */
async function main() {
  const argv = process.argv.slice(2);
  const checkOnly = argv.includes('--check');
  const explicit = argv.filter((arg) => !arg.startsWith('--'));
  const targets = explicit.length > 0 ? explicit : APPS;

  if (!existsSync(SOURCE_DIR)) {
    console.error(`[sync] 源目录不存在：${SOURCE_DIR}`);
    process.exitCode = 1;
    return;
  }

  const files = await collectFiles(SOURCE_DIR);
  if (files.length === 0) {
    console.error('[sync] 源目录中没有可同步的 .ts/.tsx 文件');
    process.exitCode = 1;
    return;
  }

  console.log(`[sync] 源文件 ${files.length} 个，目标 App ${targets.length} 个`);

  let written = 0;
  let skipped = 0;
  let drifted = 0;
  let missingApps = 0;

  for (const app of targets) {
    const appRoot = path.join(REPO_ROOT, app);
    if (!existsSync(appRoot)) {
      console.warn(`[sync] 跳过：App 目录不存在 ${app}`);
      missingApps += 1;
      continue;
    }
    const targetDir = path.join(appRoot, TARGET_SUBPATH);

    for (const relative of files) {
      const sourcePath = path.join(SOURCE_DIR, relative);
      const targetPath = path.join(targetDir, relative);
      const sourceText = await readFile(sourcePath, 'utf8');
      const targetText = await readIfExists(targetPath);

      if (targetText === sourceText) {
        skipped += 1;
        continue;
      }

      if (checkOnly) {
        drifted += 1;
        console.warn(`[sync] 差异：${app}/${TARGET_SUBPATH}/${relative}`);
        continue;
      }

      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, sourceText, 'utf8');
      written += 1;
    }
  }

  if (checkOnly) {
    if (drifted > 0) {
      console.error(`[sync] 校验失败：${drifted} 个文件与 _shared 不一致`);
      process.exitCode = 1;
    } else {
      console.log(`[sync] 校验通过：${skipped} 个文件与 _shared 完全一致`);
    }
    return;
  }

  console.log(
    `[sync] 完成：写入 ${written} 个，跳过（已一致）${skipped} 个` +
      (missingApps > 0 ? `，缺失 App ${missingApps} 个` : '')
  );
}

main().catch((error) => {
  console.error('[sync] 执行失败', error);
  process.exitCode = 1;
});
