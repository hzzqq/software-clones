import db from '../db';
import type { Show, CreateShowInput, UpdateShowInput } from '../types';

interface ShowRow {
  id: number;
  title: string;
  note: string;
  total_episodes: number;
  watched_count: number;
  created_at: string;
  updated_at: string;
}

function rowToShow(r: ShowRow): Show {
  return {
    id: r.id,
    title: r.title,
    note: r.note,
    totalEpisodes: r.total_episodes,
    watchedCount: r.watched_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listShows(): Show[] {
  const rows = db
    .prepare(`SELECT s.*,
                (SELECT COUNT(*) FROM episodes e WHERE e.show_id = s.id) AS total_episodes,
                (SELECT COUNT(*) FROM episodes e WHERE e.show_id = s.id AND e.watched = 1) AS watched_count
              FROM shows s ORDER BY s.updated_at DESC`)
    .all() as ShowRow[];
  return rows.map(rowToShow);
}

export function getShow(id: number): Show | null {
  const row = db
    .prepare(`SELECT s.*,
                (SELECT COUNT(*) FROM episodes e WHERE e.show_id = s.id) AS total_episodes,
                (SELECT COUNT(*) FROM episodes e WHERE e.show_id = s.id AND e.watched = 1) AS watched_count
              FROM shows s WHERE s.id = ?`)
    .get(id) as ShowRow | undefined;
  return row ? rowToShow(row) : null;
}

export function createShow(input: CreateShowInput): Show {
  const total = Math.max(1, Math.floor(input.totalEpisodes ?? 1));
  const info = db
    .prepare(`INSERT INTO shows (title, note) VALUES (?, ?)`)
    .run(input.title.trim(), input.note?.trim() ?? '');
  const showId = Number(info.lastInsertRowid);
  const insertEp = db.prepare(`INSERT INTO episodes (show_id, idx) VALUES (?, ?)`);
  const tx = db.transaction(() => {
    for (let i = 1; i <= total; i++) insertEp.run(showId, i);
  });
  tx();
  return getShow(showId)!;
}

export function updateShow(id: number, input: UpdateShowInput): Show | null {
  const existing = getShow(id);
  if (!existing) return null;
  const title = input.title?.trim() ?? existing.title;
  const note = input.note?.trim() ?? existing.note;
  const total = input.totalEpisodes != null ? Math.max(1, Math.floor(input.totalEpisodes)) : existing.totalEpisodes;
  const tx = db.transaction(() => {
    db.prepare(`UPDATE shows SET title = ?, note = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`)
      .run(title, note, id);
    const cur = db.prepare(`SELECT COUNT(*) AS c FROM episodes WHERE show_id = ?`).get(id) as { c: number };
    if (total > cur.c) {
      const insertEp = db.prepare(`INSERT INTO episodes (show_id, idx) VALUES (?, ?)`);
      for (let i = cur.c + 1; i <= total; i++) insertEp.run(id, i);
    } else if (total < cur.c) {
      db.prepare(`DELETE FROM episodes WHERE show_id = ? AND idx > ?`).run(id, total);
    }
  });
  tx();
  return getShow(id);
}

export function deleteShow(id: number): boolean {
  const info = db.prepare(`DELETE FROM shows WHERE id = ?`).run(id);
  return info.changes > 0;
}
