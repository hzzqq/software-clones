import db from '../db';
import { generateCode } from '../lib/code';
import { FM_ROOT } from '../config';
import { resolveSafe } from '../lib/fsPath';
import type { Share } from '../types';

interface ShareRow {
  id: number;
  code: string;
  path: string;
  expiry: string | null;
  created_at: string;
}

function rowToShare(row: ShareRow): Share {
  return {
    id: row.id,
    code: row.code,
    path: row.path,
    expiry: row.expiry,
    createdAt: row.created_at,
  };
}

const CODE_COLLISION_RETRIES = 16;

/** 创建分享短链（path 必须为虚拟根内的合法相对路径）。 */
export function createShare(input: { path: string; expiry?: string | null }): Share {
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO fm_shares (code, path, expiry, created_at) VALUES (?, ?, ?, ?)`
  );
  for (let attempt = 0; attempt < CODE_COLLISION_RETRIES; attempt += 1) {
    const code = generateCode(6);
    try {
      const info = insert.run(code, input.path, input.expiry ?? null, now);
      const id = Number(info.lastInsertRowid);
      return getShareById(id)!;
    } catch (err) {
      const sqliteErr = err as { code?: string };
      const isUnique =
        typeof sqliteErr.code === 'string' && sqliteErr.code.startsWith('SQLITE_CONSTRAINT');
      if (!isUnique) throw err;
    }
  }
  throw new Error('生成分享短码失败，请重试');
}

export function getShareById(id: number): Share | null {
  const row = db.prepare('SELECT * FROM fm_shares WHERE id = ?').get(id) as ShareRow | undefined;
  return row ? rowToShare(row) : null;
}

export function getShareByCode(code: string): Share | null {
  const row = db.prepare('SELECT * FROM fm_shares WHERE code = ?').get(code) as ShareRow | undefined;
  return row ? rowToShare(row) : null;
}

export function listShares(): Share[] {
  const rows = db
    .prepare('SELECT * FROM fm_shares ORDER BY created_at DESC, id DESC')
    .all() as ShareRow[];
  return rows.map(rowToShare);
}

export function deleteShare(id: number): boolean {
  const info = db.prepare('DELETE FROM fm_shares WHERE id = ?').run(id);
  return info.changes > 0;
}

/**
 * 校验分享是否可用：未过期且路径仍在虚拟根内。
 * 返回解析后的绝对路径，否则 null。
 */
export function resolveShareTarget(share: Share): string | null {
  if (share.expiry) {
    const exp = Date.parse(share.expiry);
    if (!Number.isNaN(exp) && Date.now() > exp) {
      return null;
    }
  }
  return resolveSafe(FM_ROOT, share.path);
}
