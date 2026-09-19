import db from '../db';
import type { CanvasNode, NodeKind } from '../types';

interface NodeRow {
  id: number;
  canvas_id: number;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

function rowToNode(r: NodeRow): CanvasNode {
  return {
    id: r.id,
    canvasId: r.canvas_id,
    kind: r.kind as NodeKind,
    x: r.x,
    y: r.y,
    w: r.w,
    h: r.h,
    content: r.content,
    color: r.color,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listNodes(canvasId: number): CanvasNode[] {
  return (
    db
      .prepare(
        'SELECT id, canvas_id, kind, x, y, w, h, content, color, created_at, updated_at FROM canvas_nodes WHERE canvas_id = ? ORDER BY id ASC',
      )
      .all(canvasId) as NodeRow[]
  ).map(rowToNode);
}

export function getNode(id: number): CanvasNode | null {
  const r = db
    .prepare(
      'SELECT id, canvas_id, kind, x, y, w, h, content, color, created_at, updated_at FROM canvas_nodes WHERE id = ?',
    )
    .get(id) as NodeRow | undefined;
  return r ? rowToNode(r) : null;
}

interface CreateNodeInput {
  canvasId: number;
  kind: NodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  content?: string;
  color?: string | null;
}

export function createNode(input: CreateNodeInput): CanvasNode {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      'INSERT INTO canvas_nodes (canvas_id, kind, x, y, w, h, content, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      input.canvasId,
      input.kind,
      input.x,
      input.y,
      input.w,
      input.h,
      input.content ?? '',
      input.color ?? null,
      now,
      now,
    );
  return getNode(Number(info.lastInsertRowid))!;
}

interface UpdateNodeInput {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  content?: string;
  color?: string | null;
}

export function updateNode(id: number, input: UpdateNodeInput): CanvasNode | null {
  const existing = getNode(id);
  if (!existing) {
    return null;
  }
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE canvas_nodes SET x = ?, y = ?, w = ?, h = ?, content = ?, color = ?, updated_at = ? WHERE id = ?',
  ).run(
    input.x ?? existing.x,
    input.y ?? existing.y,
    input.w ?? existing.w,
    input.h ?? existing.h,
    input.content ?? existing.content,
    input.color !== undefined ? input.color : existing.color,
    now,
    id,
  );
  return getNode(id);
}

export function deleteNode(id: number): boolean {
  const info = db.prepare('DELETE FROM canvas_nodes WHERE id = ?').run(id);
  return info.changes > 0;
}

/** 批量删除（框选删除）。 */
export function deleteNodes(ids: number[]): number {
  if (ids.length === 0) {
    return 0;
  }
  const placeholders = ids.map(() => '?').join(',');
  const info = db.prepare(`DELETE FROM canvas_nodes WHERE id IN (${placeholders})`).run(...ids);
  return info.changes;
}
