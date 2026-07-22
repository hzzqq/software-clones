import { db } from '../db';
import { List, ListRow } from './boardRepo';

function rowToList(row: ListRow): List {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    position: row.position,
    createdAt: row.created_at,
  };
}

export interface ListInput {
  boardId: number;
  title: string;
  position: number;
}

/** Data-access layer for lists (columns). */
export const listRepo = {
  create(input: ListInput): List {
    const now: string = new Date().toISOString();
    const info = db
      .prepare(
        'INSERT INTO list (board_id, title, position, created_at) VALUES (?, ?, ?, ?)'
      )
      .run(input.boardId, input.title, input.position, now);
    const row = db.prepare('SELECT * FROM list WHERE id = ?').get(info.lastInsertRowid) as ListRow;
    return rowToList(row);
  },

  getById(id: number): List | undefined {
    const row = db.prepare('SELECT * FROM list WHERE id = ?').get(id) as ListRow | undefined;
    return row ? rowToList(row) : undefined;
  },

  update(id: number, patch: { title?: string; position?: number }): List | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;
    const title: string = patch.title ?? existing.title;
    const position: number = patch.position ?? existing.position;
    db.prepare('UPDATE list SET title = ?, position = ? WHERE id = ?').run(
      title,
      position,
      id
    );
    return this.getById(id);
  },

  remove(id: number): void {
    db.prepare('DELETE FROM list WHERE id = ?').run(id);
  },
};

export default listRepo;
