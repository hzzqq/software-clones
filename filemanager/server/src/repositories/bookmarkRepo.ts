import db from '../db';
import type { Bookmark } from '../types';

interface BookmarkRow {
  id: number;
  path: string;
  name: string;
  created_at: string;
}

function rowToBookmark(row: BookmarkRow): Bookmark {
  return {
    id: row.id,
    path: row.path,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function createBookmark(input: { path: string; name: string }): Bookmark {
  const now = new Date().toISOString();
  const info = db
    .prepare('INSERT INTO fm_bookmarks (path, name, created_at) VALUES (?, ?, ?)')
    .run(input.path, input.name, now);
  return getBookmarkById(Number(info.lastInsertRowid))!;
}

export function getBookmarkById(id: number): Bookmark | null {
  const row = db.prepare('SELECT * FROM fm_bookmarks WHERE id = ?').get(id) as
    | BookmarkRow
    | undefined;
  return row ? rowToBookmark(row) : null;
}

export function listBookmarks(): Bookmark[] {
  const rows = db
    .prepare('SELECT * FROM fm_bookmarks ORDER BY created_at DESC, id DESC')
    .all() as BookmarkRow[];
  return rows.map(rowToBookmark);
}

export function deleteBookmark(id: number): boolean {
  const info = db.prepare('DELETE FROM fm_bookmarks WHERE id = ?').run(id);
  return info.changes > 0;
}
