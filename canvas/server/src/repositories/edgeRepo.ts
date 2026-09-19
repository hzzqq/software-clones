import db from '../db';
import type { CanvasEdge, EdgeSide } from '../types';

interface EdgeRow {
  id: number;
  canvas_id: number;
  from_id: number;
  to_id: number;
  from_side: string;
  to_side: string;
}

function rowToEdge(r: EdgeRow): CanvasEdge {
  return {
    id: r.id,
    canvasId: r.canvas_id,
    fromId: r.from_id,
    toId: r.to_id,
    fromSide: r.from_side as EdgeSide,
    toSide: r.to_side as EdgeSide,
  };
}

export function listEdges(canvasId: number): CanvasEdge[] {
  return (
    db
      .prepare(
        'SELECT id, canvas_id, from_id, to_id, from_side, to_side FROM canvas_edges WHERE canvas_id = ? ORDER BY id ASC',
      )
      .all(canvasId) as EdgeRow[]
  ).map(rowToEdge);
}

interface CreateEdgeInput {
  canvasId: number;
  fromId: number;
  toId: number;
  fromSide?: EdgeSide;
  toSide?: EdgeSide;
}

export function createEdge(input: CreateEdgeInput): CanvasEdge {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      'INSERT INTO canvas_edges (canvas_id, from_id, to_id, from_side, to_side) VALUES (?, ?, ?, ?, ?)',
    )
    .run(
      input.canvasId,
      input.fromId,
      input.toId,
      input.fromSide ?? 'right',
      input.toSide ?? 'left',
    );
  // 连线变更也刷新画布时间戳
  db.prepare('UPDATE canvases SET updated_at = ? WHERE id = ?').run(now, input.canvasId);
  return rowToEdge(
    db
      .prepare(
        'SELECT id, canvas_id, from_id, to_id, from_side, to_side FROM canvas_edges WHERE id = ?',
      )
      .get(Number(info.lastInsertRowid)) as EdgeRow,
  );
}

interface UpdateEdgeInput {
  fromSide?: EdgeSide;
  toSide?: EdgeSide;
}

export function updateEdge(id: number, input: UpdateEdgeInput): CanvasEdge | null {
  const existing = db
    .prepare('SELECT canvas_id FROM canvas_edges WHERE id = ?')
    .get(id) as { canvas_id: number } | undefined;
  if (!existing) {
    return null;
  }
  const fromSide = input.fromSide ?? 'right';
  const toSide = input.toSide ?? 'left';
  db.prepare('UPDATE canvas_edges SET from_side = ?, to_side = ? WHERE id = ?').run(
    fromSide,
    toSide,
    id,
  );
  return rowToEdge(
    db
      .prepare(
        'SELECT id, canvas_id, from_id, to_id, from_side, to_side FROM canvas_edges WHERE id = ?',
      )
      .get(id) as EdgeRow,
  );
}

export function deleteEdge(id: number): boolean {
  const info = db.prepare('DELETE FROM canvas_edges WHERE id = ?').run(id);
  return info.changes > 0;
}
