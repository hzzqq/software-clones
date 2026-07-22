import db from '../db';
import type { Note, CreateNoteInput, UpdateNoteInput } from '../types';

interface NoteRow {
  id: number;
  title: string;
  content: string;
  folder: string;
  tags: string;
  pinned: number;
  created_at: string;
  updated_at: string;
}

function parseTags(text: string): string[] {
  const matches = text.match(/#([\p{L}\p{N}_-]+)/gu) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const tag = m.slice(1).toLowerCase();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}

function deriveTitle(content: string): string {
  const firstHeading = content.match(/^#\s+(.+)$/m);
  if (firstHeading) return firstHeading[1].trim().slice(0, 120);
  const firstLine = content.trim().split('\n')[0]?.trim();
  if (firstLine) return firstLine.slice(0, 120);
  return '无标题笔记';
}

function rowToNote(r: NoteRow): Note {
  let tags: string[] = [];
  try {
    tags = JSON.parse(r.tags || '[]');
  } catch {
    tags = [];
  }
  return {
    id: r.id,
    title: r.title,
    content: r.content ?? '',
    folder: r.folder,
    tags,
    pinned: !!r.pinned,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listNotes(opts: { folder?: string; tag?: string; q?: string; includeContent?: boolean } = {}): Note[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.folder) {
    where.push('folder = ?');
    params.push(opts.folder);
  }
  if (opts.tag) {
    where.push('tags LIKE ?');
    params.push(`%${opts.tag}%`);
  }
  if (opts.q) {
    where.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${opts.q}%`, `%${opts.q}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const select = opts.includeContent ? '*' : 'id, title, folder, tags, pinned, created_at, updated_at';
  const rows = db
    .prepare(`SELECT ${select} FROM notes ${whereSql} ORDER BY pinned DESC, updated_at DESC`)
    .all(...params) as NoteRow[];
  return rows.map(rowToNote);
}

export function getNote(id: number): Note | null {
  const row = db.prepare(`SELECT * FROM notes WHERE id = ?`).get(id) as NoteRow | undefined;
  return row ? rowToNote(row) : null;
}

export function createNote(input: CreateNoteInput): Note {
  const title = input.title?.trim() || deriveTitle(input.content ?? '');
  const tags = input.tags && input.tags.length ? input.tags : parseTags(input.content ?? '');
  const info = db
    .prepare(`INSERT INTO notes (title, content, folder, tags) VALUES (?, ?, ?, ?)`)
    .run(title, input.content ?? '', input.folder?.trim() ?? '', JSON.stringify(tags));
  return getNote(Number(info.lastInsertRowid))!;
}

export function updateNote(id: number, input: UpdateNoteInput): Note | null {
  const existing = getNote(id);
  if (!existing) return null;
  const title = input.title !== undefined ? input.title.trim() : existing.title;
  const content = input.content !== undefined ? input.content : existing.content;
  const folder = input.folder !== undefined ? input.folder.trim() : existing.folder;
  let tags = existing.tags;
  if (input.tags) tags = input.tags;
  else if (input.content !== undefined) tags = parseTags(input.content);
  const pinned = input.pinned !== undefined ? (input.pinned ? 1 : 0) : existing.pinned ? 1 : 0;
  db.prepare(
    `UPDATE notes SET title = ?, content = ?, folder = ?, tags = ?, pinned = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`,
  ).run(title, content, folder, JSON.stringify(tags), pinned, id);
  return getNote(id);
}

export function deleteNote(id: number): boolean {
  const info = db.prepare(`DELETE FROM notes WHERE id = ?`).run(id);
  return info.changes > 0;
}
