import { db } from '../db';

/** Persisted favorite entry (camelCase DTO). */
export interface Favorite {
  id: number;
  toolKey: string;
  title: string;
  data: string;
  createdAt: string;
}

/** Payload for creating a favorite. */
export interface FavoriteInput {
  toolKey: string;
  title: string;
  data: string;
}

interface FavoriteRow {
  id: number;
  tool_key: string;
  title: string;
  data: string;
  created_at: string;
}

function rowToFavorite(row: FavoriteRow): Favorite {
  return {
    id: row.id,
    toolKey: row.tool_key,
    title: row.title,
    data: row.data,
    createdAt: row.created_at,
  };
}

/**
 * Data-access layer for favorites. All operations are synchronous via
 * better-sqlite3.
 */
export const favoriteRepo = {
  list(): Favorite[] {
    const rows = db
      .prepare('SELECT * FROM favorite ORDER BY created_at DESC')
      .all() as FavoriteRow[];
    return rows.map(rowToFavorite);
  },

  create(input: FavoriteInput): Favorite {
    const createdAt: string = new Date().toISOString();
    const info = db
      .prepare(
        'INSERT INTO favorite (tool_key, title, data, created_at) VALUES (?, ?, ?, ?)'
      )
      .run(input.toolKey, input.title, input.data, createdAt);
    const row = db
      .prepare('SELECT * FROM favorite WHERE id = ?')
      .get(info.lastInsertRowid) as FavoriteRow;
    return rowToFavorite(row);
  },

  remove(id: number): void {
    db.prepare('DELETE FROM favorite WHERE id = ?').run(id);
  },
};

export default favoriteRepo;
