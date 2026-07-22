import db from '../db';
import type { Episode } from '../types';

interface EpisodeRow {
  id: number;
  show_id: number;
  idx: number;
  watched: number;
  watched_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToEpisode(r: EpisodeRow): Episode {
  return {
    id: r.id,
    showId: r.show_id,
    index: r.idx,
    watched: !!r.watched,
    watchedAt: r.watched_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listEpisodes(showId: number): Episode[] {
  const rows = db
    .prepare(`SELECT * FROM episodes WHERE show_id = ? ORDER BY idx ASC`)
    .all(showId) as EpisodeRow[];
  return rows.map(rowToEpisode);
}

export function setWatched(episodeId: number, watched: boolean): Episode | null {
  const watchedAt = watched ? "strftime('%Y-%m-%dT%H:%M:%SZ','now')" : null;
  db.prepare(
    `UPDATE episodes SET watched = ?, watched_at = ${watched ? watchedAt : 'NULL'}, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`,
  ).run(watched ? 1 : 0, episodeId);
  const row = db.prepare(`SELECT * FROM episodes WHERE id = ?`).get(episodeId) as EpisodeRow | undefined;
  return row ? rowToEpisode(row) : null;
}

export function toggleWatched(episodeId: number): Episode | null {
  const row = db.prepare(`SELECT * FROM episodes WHERE id = ?`).get(episodeId) as EpisodeRow | undefined;
  if (!row) return null;
  return setWatched(episodeId, !row.watched);
}
