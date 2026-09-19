import fs from 'fs';
import { UPLOAD_DIR } from '../config';

/** 确保上传目录存在（幂等）。 */
export function ensureUploadDir(): string {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}

/**
 * 计算磁盘上的存储文件名：短码 + 下划线 + 清洗后的文件名。
 * 短码全局唯一，因此磁盘文件名不会冲突。
 */
export function storedFileName(code: string, safeName: string): string {
  return `${code}_${safeName}`;
}

/** 拼接上传目录下的绝对路径。 */
export function uploadPath(storedName: string): string {
  return `${UPLOAD_DIR}/${storedName}`;
}
