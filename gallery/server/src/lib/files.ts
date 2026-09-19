import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR } from '../config';

/**
 * 图片磁盘落盘工具。
 * 落盘文件名一律由服务端生成的短码 + 扩展名构成，不拼接用户文件名到路径，
 * 因此不可能发生目录穿越；所有读取也只在本目录内进行。
 */

/** 确保相册落盘目录存在（幂等）。 */
export function ensureGalleryDir(): string {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}

/** 由短码与扩展名构造磁盘存储文件名。 */
export function storedFileName(code: string, ext: string): string {
  const cleanExt = ext.startsWith('.') ? ext : ext ? `.${ext}` : '';
  return `${code}${cleanExt}`;
}

/** 拼接落盘目录下的绝对路径（仅用于已清洗的 stored_name）。 */
export function assetDiskPath(storedName: string): string {
  return path.join(UPLOAD_DIR, storedName);
}
