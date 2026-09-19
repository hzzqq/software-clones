import db from '../db';
import type { Canvas } from '../types';

interface CanvasRow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

function rowToCanvas(r: CanvasRow): Canvas {
  return { id: r.id, name: r.name, createdAt: r.created_at, updatedAt: r.updated_at };
}

/** 画布列表（最近更新倒序）。 */
export function listCanvases(): Canvas[] {
  return (
    db
      .prepare('SELECT id, name, created_at, updated_at FROM canvases ORDER BY updated_at DESC, id DESC')
      .all() as CanvasRow[]
  ).map(rowToCanvas);
}

export function getCanvas(id: number): Canvas | null {
  const r = db
    .prepare('SELECT id, name, created_at, updated_at FROM canvases WHERE id = ?')
    .get(id) as CanvasRow | undefined;
  return r ? rowToCanvas(r) : null;
}

export function createCanvas(name: string = 'Untitled'): Canvas {
  const now = new Date().toISOString();
  const info = db
    .prepare('INSERT INTO canvases (name, created_at, updated_at) VALUES (?, ?, ?)')
    .run(name, now, now);
  return getCanvas(Number(info.lastInsertRowid))!;
}

export function updateCanvas(id: number, name: string): Canvas | null {
  const existing = getCanvas(id);
  if (!existing) {
    return null;
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE canvases SET name = ?, updated_at = ? WHERE id = ?').run(name, now, id);
  return getCanvas(id);
}

export function deleteCanvas(id: number): boolean {
  const info = db.prepare('DELETE FROM canvases WHERE id = ?').run(id);
  return info.changes > 0;
}

/** 刷新画布 updated_at（任何节点/连线变更后调用，使列表排序正确）。 */
export function touchCanvas(id: number): void {
  db.prepare("UPDATE canvases SET updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    id,
  );
}
