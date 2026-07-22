import db from '../db';
import type { Scene, CreateSceneInput, UpdateSceneInput } from '../types';

interface SceneRow {
  id: number;
  name: string;
  data: string;
  created_at: string;
  updated_at: string;
}

function rowToScene(r: SceneRow): Scene {
  return { id: r.id, name: r.name, data: r.data, createdAt: r.created_at, updatedAt: r.updated_at };
}

export function listScenes(): Scene[] {
  const rows = db.prepare(`SELECT * FROM scenes ORDER BY updated_at DESC`).all() as SceneRow[];
  return rows.map(rowToScene);
}

export function getScene(id: number): Scene | null {
  const row = db.prepare(`SELECT * FROM scenes WHERE id = ?`).get(id) as SceneRow | undefined;
  return row ? rowToScene(row) : null;
}

export function createScene(input: CreateSceneInput): Scene {
  const info = db
    .prepare(`INSERT INTO scenes (name, data) VALUES (?, ?)`)
    .run(input.name?.trim() || '未命名白板', input.data);
  return getScene(Number(info.lastInsertRowid))!;
}

export function updateScene(id: number, input: UpdateSceneInput): Scene | null {
  const existing = getScene(id);
  if (!existing) return null;
  const name = input.name?.trim() ?? existing.name;
  const data = input.data ?? existing.data;
  db.prepare(
    `UPDATE scenes SET name = ?, data = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`,
  ).run(name, data, id);
  return getScene(id);
}

export function deleteScene(id: number): boolean {
  const info = db.prepare(`DELETE FROM scenes WHERE id = ?`).run(id);
  return info.changes > 0;
}
