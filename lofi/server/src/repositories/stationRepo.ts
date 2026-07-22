import db from '../db';
import { Station } from '../types';

interface StationRow {
  id: number;
  name: string;
  stream_url: string;
  description: string;
  category: string;
  likes: number;
  created_at: string;
}

function rowToStation(row: StationRow): Station {
  return {
    id: row.id,
    name: row.name,
    streamUrl: row.stream_url,
    description: row.description,
    category: row.category,
    likes: row.likes,
    createdAt: row.created_at,
  };
}

export function listStations(category?: string): Station[] {
  const sql =
    category
      ? `SELECT * FROM stations WHERE category = ? ORDER BY likes DESC, name ASC`
      : `SELECT * FROM stations ORDER BY likes DESC, name ASC`;
  const params = category ? [category] : [];
  return (db.prepare(sql).all(...params) as StationRow[]).map(rowToStation);
}

export function getStation(id: number): Station | null {
  const row = db.prepare(`SELECT * FROM stations WHERE id = ?`).get(id) as
    | StationRow
    | undefined;
  return row ? rowToStation(row) : null;
}

export function createStation(input: {
  name: string;
  streamUrl: string;
  description?: string;
  category?: string;
}): Station {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO stations (name, stream_url, description, category, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      input.name,
      input.streamUrl,
      input.description ?? '',
      input.category ?? 'lofi',
      now,
    );
  return getStation(Number(info.lastInsertRowid))!;
}

export function updateStation(
  id: number,
  input: { name?: string; streamUrl?: string; description?: string; category?: string },
): Station | null {
  const existing = getStation(id);
  if (!existing) return null;
  const name = input.name ?? existing.name;
  const streamUrl = input.streamUrl ?? existing.streamUrl;
  const description = input.description ?? existing.description;
  const category = input.category ?? existing.category;
  db.prepare(
    `UPDATE stations SET name = ?, stream_url = ?, description = ?, category = ? WHERE id = ?`,
  ).run(name, streamUrl, description, category, id);
  return getStation(id);
}

export function deleteStation(id: number): boolean {
  const info = db.prepare(`DELETE FROM stations WHERE id = ?`).run(id);
  return info.changes > 0;
}

export function likeStation(id: number): Station | null {
  db.prepare(`UPDATE stations SET likes = likes + 1 WHERE id = ?`).run(id);
  return getStation(id);
}

/** Returns the most-liked station (random tie-break) or null if empty. */
export function featuredStation(): Station | null {
  const rows = db
    .prepare(`SELECT * FROM stations ORDER BY likes DESC, RANDOM() LIMIT 1`)
    .all() as StationRow[];
  return rows[0] ? rowToStation(rows[0]) : null;
}

/** Seed a few public lo-fi streams the first time the app boots. */
export function seedIfEmpty(): void {
  const count = (db.prepare(`SELECT COUNT(*) AS c FROM stations`).get() as { c: number }).c;
  if (count > 0) return;
  const now = new Date().toISOString();
  const seeds: [string, string, string, string][] = [
    ['Groove Salad', 'https://ice1.somafm.com/groovesalad-128-mp3', 'SomaFM 的舒缓电子/氛围流，专注与放松首选。', 'lofi'],
    ['Drone Zone', 'https://ice1.somafm.com/dronezone-128-mp3', '极简氛围与太空感声景，适合深夜 coding。', 'ambient'],
    ['Lush', 'https://ice1.somafm.com/lush-128-mp3', '柔和的声乐与电子 chillout。', 'chill'],
    ['Sonnet', 'https://ice1.somafm.com/sonnet-128-mp3', '古典室内乐与现代改编，安静工作伴侣。', 'classical'],
  ];
  const insert = db.prepare(
    `INSERT INTO stations (name, stream_url, description, category, created_at) VALUES (?, ?, ?, ?, ?)`,
  );
  for (const [name, streamUrl, description, category] of seeds) {
    insert.run(name, streamUrl, description, category, now);
  }
}
