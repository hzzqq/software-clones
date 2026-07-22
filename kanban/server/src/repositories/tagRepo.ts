import { db } from '../db';
import { Tag, TagRow } from './boardRepo';

function rowToTag(row: TagRow): Tag {
  return {
    id: row.id,
    boardId: row.board_id,
    name: row.name,
    color: row.color,
  };
}

export interface TagInput {
  boardId: number;
  name: string;
  color: string;
}

/** Data-access layer for tags and their assignment to cards. */
export const tagRepo = {
  create(input: TagInput): Tag {
    const info = db
      .prepare('INSERT INTO tag (board_id, name, color) VALUES (?, ?, ?)')
      .run(input.boardId, input.name, input.color);
    const row = db.prepare('SELECT * FROM tag WHERE id = ?').get(info.lastInsertRowid) as TagRow;
    return rowToTag(row);
  },

  listByBoard(boardId: number): Tag[] {
    const rows = db.prepare('SELECT * FROM tag WHERE board_id = ?').all(boardId) as TagRow[];
    return rows.map(rowToTag);
  },

  getById(id: number): Tag | undefined {
    const row = db.prepare('SELECT * FROM tag WHERE id = ?').get(id) as TagRow | undefined;
    return row ? rowToTag(row) : undefined;
  },

  remove(id: number): void {
    db.prepare('DELETE FROM tag WHERE id = ?').run(id);
  },

  update(id: number, patch: { name: string; color: string }): Tag {
    db.prepare('UPDATE tag SET name = ?, color = ? WHERE id = ?').run(patch.name, patch.color, id);
    const row = db.prepare('SELECT * FROM tag WHERE id = ?').get(id) as TagRow;
    return rowToTag(row);
  },

  addCardTag(cardId: number, tagId: number): void {
    db.prepare(
      'INSERT OR IGNORE INTO card_tag (card_id, tag_id) VALUES (?, ?)'
    ).run(cardId, tagId);
  },

  removeCardTag(cardId: number, tagId: number): void {
    db.prepare('DELETE FROM card_tag WHERE card_id = ? AND tag_id = ?').run(cardId, tagId);
  },
};

export default tagRepo;
