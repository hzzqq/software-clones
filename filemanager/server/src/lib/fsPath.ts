import fs from 'fs';
import path from 'path';
import { FM_ROOT } from '../config';

/**
 * 虚拟根目录内的安全路径解析 —— 路径穿越防护的核心。
 *
 * 任何用户传入的 path 都先 `path.resolve(root, userPath)` 规范化，
 * 再用 `path.relative(root, resolved)` 校验结果确实位于 root 之内。
 * 只要 relative 以 `..` 开头（或意外变成绝对路径），就判定为非法，
 * 拒绝任何 `..` 穿越出根目录的访问，绝不暴露宿主机真实文件系统。
 *
 * @returns 解析后的绝对路径；若越界或非法返回 null。
 */
export function resolveSafe(root: string, userPath: string): string | null {
  // 去掉前导斜杠，避免被当成绝对路径。
  const safeUser: string =
    userPath && (userPath.startsWith('/') || userPath.startsWith('\\'))
      ? userPath.replace(/^[\\/]+/, '')
      : userPath;
  const resolved: string = path.resolve(root, safeUser || '.');
  const rel: string = path.relative(root, resolved);
  // rel 为 '' 表示根本身；以 '..' 开头或仍为绝对路径 → 越界。
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    return null;
  }
  return resolved;
}

/** 将绝对路径转为相对虚拟根的路径（始终以 / 开头，根目录为 /）。 */
export function toRelative(root: string, absPath: string): string {
  const rel: string = path.relative(root, absPath);
  if (rel === '') {
    return '/';
  }
  return `/${rel.split(path.sep).join('/')}`;
}

/** 计算某绝对路径的父目录（相对根；根目录的父仍是根）。 */
export function parentRelative(root: string, absPath: string): string {
  if (path.resolve(absPath) === path.resolve(root)) {
    return '/';
  }
  return toRelative(root, path.dirname(absPath));
}

/** 确保虚拟根目录存在（首次运行 mkdir）。 */
export function ensureFmRoot(): void {
  fs.mkdirSync(FM_ROOT, { recursive: true });
}

/**
 * 首次运行时若虚拟根为空，写入一份示例文件，方便直接体验浏览/预览。
 */
export function seedFmRootIfEmpty(): void {
  ensureFmRoot();
  const readmePath = path.join(FM_ROOT, 'README.txt');
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(
      readmePath,
      [
        '这是一个「虚拟根目录」——文件管理器只会在该目录内提供浏览、预览与下载。',
        '你可以把文件放进 server/data/fm-root/ 后刷新页面查看。',
        '所有路径访问都被限制在根目录之内，无法穿越到宿主机其它位置。',
      ].join('\n')
    );
  }
  const samplesDir = path.join(FM_ROOT, 'samples');
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
    fs.writeFileSync(
      path.join(samplesDir, 'hello.txt'),
      'Hello from the file manager sample file.\n这是一份用于预览的文本示例文件。\n'
    );
  }
}
