import { db } from '../db';
import type { Entry, EntryFilter, EntryInput, EntryRow } from '../types';
import { getSecretKey } from '../utils/secretKey';
import { encryptText, decryptText } from '../utils/crypto';

function rowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    title: row.title,
    username: row.username,
    password: decryptText(row.password_enc, getSecretKey()),
    url: row.url,
    notes: row.notes,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCategory(raw: unknown): string {
  return typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, 32) : '其他';
}

/** 密码保险库条目的数据访问层：加密落库、解密出参。 */
export const entryRepo = {
  list(filter: EntryFilter): Entry[] {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filter.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }
    if (filter.q) {
      conditions.push('(title LIKE ? OR username LIKE ? OR url LIKE ? OR notes LIKE ?)');
      const like = `%${filter.q}%`;
      params.push(like, like, like, like);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db
      .prepare(`SELECT * FROM vault_entry ${where} ORDER BY updated_at DESC, id DESC`)
      .all(...params) as EntryRow[];
    return rows.map(rowToEntry);
  },

  getById(id: number): Entry | undefined {
    const row = db.prepare('SELECT * FROM vault_entry WHERE id = ?').get(id) as EntryRow | undefined;
    return row ? rowToEntry(row) : undefined;
  },

  create(input: EntryInput): Entry {
    const now: string = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO vault_entry (title, username, password_enc, url, notes, category, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.title,
        input.username,
        encryptText(input.password, getSecretKey()),
        input.url,
        input.notes,
        input.category,
        now,
        now
      );
    return this.getById(Number(info.lastInsertRowid)) as Entry;
  },

  update(id: number, patch: Partial<EntryInput>): Entry | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;

    const fields: string[] = [];
    const params: unknown[] = [];
    if (patch.title !== undefined) {
      fields.push('title = ?');
      params.push(patch.title);
    }
    if (patch.username !== undefined) {
      fields.push('username = ?');
      params.push(patch.username);
    }
    if (patch.password !== undefined) {
      fields.push('password_enc = ?');
      params.push(encryptText(patch.password, getSecretKey()));
    }
    if (patch.url !== undefined) {
      fields.push('url = ?');
      params.push(patch.url);
    }
    if (patch.notes !== undefined) {
      fields.push('notes = ?');
      params.push(patch.notes);
    }
    if (patch.category !== undefined) {
      fields.push('category = ?');
      params.push(patch.category);
    }
    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    if (fields.length > 1) {
      db.prepare(`UPDATE vault_entry SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    }
    return this.getById(id);
  },

  remove(id: number): void {
    db.prepare('DELETE FROM vault_entry WHERE id = ?').run(id);
  },

  /** 全部已使用的分类（按出现次数降序）。 */
  categories(): string[] {
    const rows = db
      .prepare('SELECT category, COUNT(*) AS cnt FROM vault_entry GROUP BY category ORDER BY cnt DESC, category ASC')
      .all() as { category: string }[];
    return rows.map((r) => r.category);
  },
};

export { normalizeCategory };
export default entryRepo;
