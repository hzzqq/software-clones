import { db } from '../db';

export interface Board {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: number;
  boardId: number;
  title: string;
  position: number;
  createdAt: string;
}

export interface Card {
  id: number;
  listId: number;
  title: string;
  description: string;
  dueDate: string | null;
  priority: number;
  completed: number;
  position: number;
  createdAt: string;
  updatedAt: string;
  tagIds: number[];
}

export interface Tag {
  id: number;
  boardId: number;
  name: string;
  color: string;
}

/** Aggregated board view including lists, cards (with tags) and tags. */
export interface BoardDetail {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  lists: List[];
  cards: Card[];
  tags: Tag[];
}

interface BoardRow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}
export interface ListRow {
  id: number;
  board_id: number;
  title: string;
  position: number;
  created_at: string;
}
export interface CardRow {
  id: number;
  list_id: number;
  title: string;
  description: string;
  due_date: string | null;
  priority: number;
  completed: number;
  position: number;
  created_at: string;
  updated_at: string;
}
export interface TagRow {
  id: number;
  board_id: number;
  name: string;
  color: string;
}
interface CardTagRow {
  card_id: number;
  tag_id: number;
}

function rowToBoard(row: BoardRow): Board {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToList(row: ListRow): List {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    position: row.position,
    createdAt: row.created_at,
  };
}

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

function rowToTag(row: TagRow): Tag {
  return {
    id: row.id,
    boardId: row.board_id,
    name: row.name,
    color: row.color,
  };
}

/**
 * Data-access layer for boards, including the aggregated board detail used by
 * the board page.
 */
export const boardRepo = {
  list(): Board[] {
    const rows = db
      .prepare('SELECT * FROM board ORDER BY created_at DESC')
      .all() as BoardRow[];
    return rows.map(rowToBoard);
  },

  create(name: string): Board {
    const now: string = new Date().toISOString();
    const info = db
      .prepare('INSERT INTO board (name, created_at, updated_at) VALUES (?, ?, ?)')
      .run(name, now, now);
    const row = db.prepare('SELECT * FROM board WHERE id = ?').get(info.lastInsertRowid) as BoardRow;
    return rowToBoard(row);
  },

  getById(id: number): Board | undefined {
    const row = db.prepare('SELECT * FROM board WHERE id = ?').get(id) as BoardRow | undefined;
    return row ? rowToBoard(row) : undefined;
  },

  update(id: number, name: string): Board | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;
    const updatedAt: string = new Date().toISOString();
    db.prepare('UPDATE board SET name = ?, updated_at = ? WHERE id = ?').run(
      name,
      updatedAt,
      id
    );
    return this.getById(id);
  },

  remove(id: number): void {
    db.prepare('DELETE FROM board WHERE id = ?').run(id);
  },

  /** Returns the full board detail, or undefined if the board is missing. */
  getDetail(id: number): BoardDetail | undefined {
    const board = this.getById(id);
    if (!board) return undefined;

    const lists = db
      .prepare('SELECT * FROM list WHERE board_id = ? ORDER BY position ASC')
      .all(id) as ListRow[];
    const listIds: number[] = lists.map((l) => l.id);

    const cards: Card[] =
      listIds.length > 0
        ? (
            db
              .prepare(
                `SELECT * FROM card WHERE list_id IN (${listIds.map(() => '?').join(',')}) ORDER BY position ASC`
              )
              .all(...listIds) as CardRow[]
          ).map(rowToCard)
        : [];

    const tags = db
      .prepare('SELECT * FROM tag WHERE board_id = ?')
      .all(id) as TagRow[];

    const cardIds: number[] = cards.map((c) => c.id);
    const cardTags: CardTagRow[] =
      cardIds.length > 0
        ? (db
            .prepare(
              `SELECT * FROM card_tag WHERE card_id IN (${cardIds.map(() => '?').join(',')})`
            )
            .all(...cardIds) as CardTagRow[])
        : [];

    for (const card of cards) {
      card.tagIds = cardTags.filter((ct) => ct.card_id === card.id).map((ct) => ct.tag_id);
    }

    return {
      ...board,
      lists: lists.map(rowToList),
      cards,
      tags: tags.map(rowToTag),
    };
  },
};

export default boardRepo;
