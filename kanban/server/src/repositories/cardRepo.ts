import { db } from '../db';
import { Card, CardRow } from './boardRepo';

export interface CardInput {
  listId: number;
  title: string;
  position: number;
  description?: string;
  dueDate?: string | null;
  priority?: number;
  completed?: number;
}

export type CardPatch = Partial<{
  title: string;
  description: string;
  dueDate: string | null;
  priority: number;
  completed: number;
  position: number;
  listId: number;
}>;

function rowToCard(row: CardRow): Card {
  return {
    id: row.id,
    listId: row.list_id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    priority: row.priority,
    completed: row.completed,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tagIds: [],
  };
}

/** Data-access layer for cards. Position is an integer sort key. */
export const cardRepo = {
  create(input: CardInput): Card {
    const now: string = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO card (list_id, title, description, due_date, priority, completed, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.listId,
        input.title,
        input.description ?? '',
        input.dueDate ?? null,
        input.priority ?? 0,
        input.completed ?? 0,
        input.position,
        now,
        now
      );
    const row = db.prepare('SELECT * FROM card WHERE id = ?').get(info.lastInsertRowid) as CardRow;
    const card = rowToCard(row);
    card.tagIds = [];
    return card;
  },

  getById(id: number): Card | undefined {
    const row = db.prepare('SELECT * FROM card WHERE id = ?').get(id) as CardRow | undefined;
    if (!row) return undefined;
    const card = rowToCard(row);
    const tags = db
      .prepare('SELECT tag_id FROM card_tag WHERE card_id = ?')
      .all(id) as Array<{ tag_id: number }>;
    card.tagIds = tags.map((t) => t.tag_id);
    return card;
  },

  update(id: number, patch: CardPatch): Card | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;
    const title: string = patch.title ?? existing.title;
    const description: string = patch.description ?? existing.description;
    const dueDate: string | null = patch.dueDate === undefined ? existing.dueDate : patch.dueDate;
    const priority: number = patch.priority ?? existing.priority;
    const completed: number = patch.completed ?? existing.completed;
    const position: number = patch.position ?? existing.position;
    const listId: number = patch.listId ?? existing.listId;
    const updatedAt: string = new Date().toISOString();
    db.prepare(
      `UPDATE card SET list_id = ?, title = ?, description = ?, due_date = ?, priority = ?, completed = ?, position = ?, updated_at = ? WHERE id = ?`
    ).run(title === undefined ? existing.title : title, description, dueDate, priority, completed, position, listId, updatedAt, id);
    return this.getById(id);
  },

  remove(id: number): void {
    db.prepare('DELETE FROM card WHERE id = ?').run(id);
  },

  listByList(listId: number): Card[] {
    const rows = db
      .prepare('SELECT * FROM card WHERE list_id = ? ORDER BY position ASC')
      .all(listId) as CardRow[];
    return rows.map((row) => {
      const card = rowToCard(row);
      const tags = db
        .prepare('SELECT tag_id FROM card_tag WHERE card_id = ?')
        .all(card.id) as Array<{ tag_id: number }>;
      card.tagIds = tags.map((t) => t.tag_id);
      return card;
    });
  },
};

export default cardRepo;
