import db from '../db';
import { generateCode } from '../lib/code';
import type { Paste, PasteInput } from '../types';

interface PasteRow {
  id: number;
  code: string;
  title: string;
  content: string;
  language: string;
  visibility: string;
  expires_at: string | null;
  created_at: string;
}

function rowToPaste(row: PasteRow): Paste {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    content: row.content,
    language: row.language,
    visibility: row.visibility,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

/** 创建粘贴（生成短码，按 expiresInMinutes 计算过期时间）。 */
export function createPaste(input: PasteInput): Paste {
  if (!input.content || typeof input.content !== 'string') {
    throw new Error('content 不能为空');
  }
  let code = generateCode(6);
  // 极小概率碰撞时重试
  while (db.prepare('SELECT 1 FROM pastes WHERE code = ?').get(code)) {
    code = generateCode(6);
  }
  const now = new Date();
  const expiresAt =
    input.expiresInMinutes && input.expiresInMinutes > 0
      ? new Date(now.getTime() + input.expiresInMinutes * 60_000).toISOString()
      : null;
  const visibility = input.visibility === 'private' ? 'private' : 'public';
  const info = db
    .prepare(
      `INSERT INTO pastes (code, title, content, language, visibility, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      code,
      input.title?.trim() ?? '',
      input.content,
      input.language?.trim() || 'text',
      visibility,
      expiresAt,
      now.toISOString(),
    );
  return rowToPaste(db.prepare('SELECT * FROM pastes WHERE id = ?').get(Number(info.lastInsertRowid)) as PasteRow);
}

/** 按短码查询；过期或不存在返回 null。 */
export function getPasteByCode(code: string): Paste | null {
  const row = db.prepare('SELECT * FROM pastes WHERE code = ?').get(code) as PasteRow | undefined;
  if (!row) return null;
  if (isExpired(row.expires_at)) return null;
  return rowToPaste(row);
}

/** 硬删除。 */
export function deletePaste(code: string): boolean {
  const info = db.prepare('DELETE FROM pastes WHERE code = ?').run(code);
  return info.changes > 0;
}

/** 列出未过期的公开粘贴（按创建时间倒序）。 */
export function listPublicPastes(): Paste[] {
  const rows = db
    .prepare(
      `SELECT * FROM pastes
       WHERE visibility = 'public'
         AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY created_at DESC LIMIT 100`,
    )
    .all() as PasteRow[];
  return rows.map(rowToPaste);
}
