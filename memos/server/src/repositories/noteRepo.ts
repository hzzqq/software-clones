import db from '../db';
import { Note, Visibility } from '../types';

export interface NoteRow {
  id: number;
  content: string;
  visibility: string;
  pinned: number;
  archived: number;
  created_at: string;
  updated_at: string;
  user_id: number;
  tag_names: string | null;
}

export interface NoteFilter {
  userId?: number;
  visibility?: Visibility;
  tag?: string;
  archived?: boolean;
  pinned?: boolean;
  q?: string;
  /** 必须全部命中的正文关键词（AND）。 */
  terms?: string[];
  /** 命中任一即排除的正文关键词。 */
  exclude?: string[];
  /** 必须全部带有的标签（AND），与单数 `tag` 可叠加。 */
  tags?: string[];
  /** 创建时间下界（含），YYYY-MM-DD。 */
  after?: string;
  /** 创建时间上界（不含），YYYY-MM-DD。 */
  before?: string;
}

/**
 * 转义 LIKE 的通配符，避免用户搜 `100%` 或 `a_b` 时被当成模式匹配。
 * 配合 SQL 里的 `ESCAPE '\'` 使用。
 */
function likeEscape(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    content: row.content,
    visibility: row.visibility as Visibility,
    pinned: !!row.pinned,
    archived: !!row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
  };
}

function tagSubquery(): string {
  return `(SELECT group_concat(t.name) FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id = n.id)`;
}

export function listNotes(filter: NoteFilter = {}): Note[] {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (typeof filter.userId === 'number') {
    clauses.push('n.user_id = ?');
    params.push(filter.userId);
  }
  if (typeof filter.archived === 'boolean') {
    clauses.push('n.archived = ?');
    params.push(filter.archived ? 1 : 0);
  }
  if (filter.visibility) {
    clauses.push('n.visibility = ?');
    params.push(filter.visibility);
  }
  if (typeof filter.pinned === 'boolean') {
    clauses.push('n.pinned = ?');
    params.push(filter.pinned ? 1 : 0);
  }
  if (filter.tag) {
    clauses.push(
      `n.id IN (SELECT nt.note_id FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE t.name = ?)`,
    );
    params.push(filter.tag);
  }
  if (filter.q) {
    clauses.push(`n.content LIKE ? ESCAPE '\\'`);
    params.push(`%${likeEscape(filter.q)}%`);
  }
  // 结构化检索：关键词 AND、排除词 NOT、标签 AND、创建时间半开区间 [after, before)。
  for (const term of filter.terms ?? []) {
    if (!term) continue;
    clauses.push(`n.content LIKE ? ESCAPE '\\'`);
    params.push(`%${likeEscape(term)}%`);
  }
  for (const term of filter.exclude ?? []) {
    if (!term) continue;
    clauses.push(`n.content NOT LIKE ? ESCAPE '\\'`);
    params.push(`%${likeEscape(term)}%`);
  }
  for (const tag of filter.tags ?? []) {
    if (!tag) continue;
    clauses.push(
      `n.id IN (SELECT nt.note_id FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE t.name = ?)`,
    );
    params.push(tag);
  }
  if (filter.after) {
    // created_at 是 ISO 字符串，字典序与时间序一致，可直接比较。
    clauses.push('n.created_at >= ?');
    params.push(filter.after);
  }
  if (filter.before) {
    clauses.push('n.created_at < ?');
    params.push(filter.before);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  // Pinned first, then newest. NULL tag_names handled by coalesce.
  const sql = `SELECT n.*, ${tagSubquery()} AS tag_names FROM notes n ${where} ORDER BY n.pinned DESC, n.created_at DESC`;
  const rows = db.prepare(sql).all(...params) as NoteRow[];
  return rows.map(rowToNote);
}

export function getNote(id: number, userId?: number): Note | null {
  const sql = `SELECT n.*, ${tagSubquery()} AS tag_names FROM notes n WHERE n.id = ?${
    userId === undefined ? '' : ' AND n.user_id = ?'
  }`;
  const row =
    userId === undefined
      ? (db.prepare(sql).get(id) as NoteRow | undefined)
      : (db.prepare(sql).get(id, userId) as NoteRow | undefined);
  return row ? rowToNote(row) : null;
}

export function createNote(
  input: { content: string; visibility: Visibility; tags: string[] },
  userId: number,
): Note {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO notes (content, visibility, pinned, archived, user_id, created_at, updated_at)
       VALUES (?, ?, 0, 0, ?, ?, ?)`,
    )
    .run(input.content, input.visibility, userId, now, now);
  const id = Number(info.lastInsertRowid);
  syncTags(id, input.tags);
  return getNote(id)!;
}

export function updateNote(
  id: number,
  input: { content?: string; visibility?: Visibility; tags?: string[] },
  userId?: number,
): Note | null {
  const existing = getNote(id, userId);
  if (!existing) return null;

  const content = input.content ?? existing.content;
  const visibility = input.visibility ?? existing.visibility;
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE notes SET content = ?, visibility = ?, updated_at = ? WHERE id = ?`,
  ).run(content, visibility, now, id);

  if (input.tags) {
    syncTags(id, input.tags);
  }
  return getNote(id);
}

export function setArchived(id: number, archived: boolean, userId?: number): Note | null {
  if (getNote(id, userId) === null) return null;
  const now = new Date().toISOString();
  db.prepare(`UPDATE notes SET archived = ?, updated_at = ? WHERE id = ?`).run(
    archived ? 1 : 0,
    now,
    id,
  );
  return getNote(id);
}

export function setPinned(id: number, pinned: boolean, userId?: number): Note | null {
  if (getNote(id, userId) === null) return null;
  const now = new Date().toISOString();
  db.prepare(`UPDATE notes SET pinned = ?, updated_at = ? WHERE id = ?`).run(
    pinned ? 1 : 0,
    now,
    id,
  );
  return getNote(id);
}

export function deleteNote(id: number, userId?: number): boolean {
  if (userId !== undefined) {
    const row = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(id, userId);
    if (!row) return false;
  }
  const info = db.prepare(`DELETE FROM notes WHERE id = ?`).run(id);
  return info.changes > 0;
}

/** Replace the tag set for a note, creating missing tags on the fly. */
export function syncTags(noteId: number, tagNames: string[]): void {
  const unique = Array.from(new Set(tagNames.map((t) => t.toLowerCase())));
  db.prepare(`DELETE FROM note_tags WHERE note_id = ?`).run(noteId);

  const findTag = db.prepare(`SELECT id FROM tags WHERE name = ?`);
  const insertTag = db.prepare(`INSERT INTO tags (name) VALUES (?)`);
  const link = db.prepare(
    `INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)`,
  );

  for (const name of unique) {
    let row = findTag.get(name) as { id: number } | undefined;
    if (!row) {
      const info = insertTag.run(name);
      row = { id: Number(info.lastInsertRowid) };
    }
    link.run(noteId, row.id);
  }
}
