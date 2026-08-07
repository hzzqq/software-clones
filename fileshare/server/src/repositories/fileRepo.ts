import db from '../db';
import type { SharedFile } from '../types';
import { generateCode } from '../lib/code';

export interface FileRow {
  id: number;
  code: string;
  original_name: string;
  stored_name: string;
  size: number;
  mime_type: string;
  download_count: number;
  created_at: string;
}

function rowToFile(row: FileRow): SharedFile {
  return {
    id: row.id,
    code: row.code,
    originalName: row.original_name,
    size: row.size,
    mimeType: row.mime_type,
    downloadCount: row.download_count,
    createdAt: row.created_at,
  };
}

/** 短码唯一性冲突重试的最大次数。 */
const CODE_COLLISION_RETRIES = 10;

/**
 * 生成带短码的文件记录：内部循环「生成短码 → 尝试插入」，
 * 命中 code 唯一索引时换码重试（防碰撞）。
 *
 * @returns 记录与最终使用的短码（调用方用短码落盘磁盘文件）
 */
export function createFile(input: {
  originalName: string;
  storedName: string;
  size: number;
  mimeType: string;
}): { file: SharedFile; code: string } {
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO files (code, original_name, stored_name, size, mime_type, download_count, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  );
  for (let attempt = 0; attempt < CODE_COLLISION_RETRIES; attempt += 1) {
    const code = generateCode(6);
    try {
      const info = insert.run(code, input.originalName, input.storedName, input.size, input.mimeType, now);
      const id = Number(info.lastInsertRowid);
      return { file: getFileById(id)!, code };
    } catch (err) {
      const isUniqueViolation =
        err instanceof Error && typeof (err as { code?: unknown }).code === 'string'
          ? (err as unknown as { code: string }).code.startsWith('SQLITE_CONSTRAINT')
          : false;
      if (!isUniqueViolation) {
        throw err;
      }
      // 短码冲突：继续下一次重试。
    }
  }
  throw new Error('生成分享短码失败，请重试');
}

export function listFiles(): SharedFile[] {
  const rows = db
    .prepare('SELECT * FROM files ORDER BY created_at DESC, id DESC')
    .all() as FileRow[];
  return rows.map(rowToFile);
}

export function getFileById(id: number): SharedFile | null {
  const row = db.prepare('SELECT * FROM files WHERE id = ?').get(id) as FileRow | undefined;
  return row ? rowToFile(row) : null;
}

export function getFileByCode(code: string): SharedFile | null {
  const row = db.prepare('SELECT * FROM files WHERE code = ?').get(code) as FileRow | undefined;
  return row ? rowToFile(row) : null;
}

/** 下载计数 +1，返回最新记录。 */
export function incrementDownloadCount(code: string): SharedFile | null {
  const info = db
    .prepare('UPDATE files SET download_count = download_count + 1 WHERE code = ?')
    .run(code);
  if (info.changes === 0) {
    return null;
  }
  return getFileByCode(code);
}

/** 删除记录，返回被删除记录的 stored_name（磁盘清理由调用方完成）。 */
export function deleteFileById(id: number): { deleted: boolean; storedName?: string } {
  const row = db.prepare('SELECT stored_name FROM files WHERE id = ?').get(id) as
    | { stored_name: string }
    | undefined;
  if (!row) {
    return { deleted: false };
  }
  db.prepare('DELETE FROM files WHERE id = ?').run(id);
  return { deleted: true, storedName: row.stored_name };
}
