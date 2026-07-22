import { db } from '../db';

/** Persisted history entry (camelCase DTO). */
export interface History {
  id: number;
  toolKey: string;
  summary: string;
  createdAt: string;
}

/** Payload for creating a history entry. */
export interface HistoryInput {
  toolKey: string;
  summary: string;
}

interface HistoryRow {
  id: number;
  tool_key: string;
  summary: string;
  created_at: string;
}

function rowToHistory(row: HistoryRow): History {
  return {
    id: row.id,
    toolKey: row.tool_key,
    summary: row.summary,
    createdAt: row.created_at,
  };
}

/**
 * Data-access layer for history. Newest entries first, capped by `limit`.
 */
export const historyRepo = {
  list(limit: number): History[] {
    const rows = db
      .prepare('SELECT * FROM history ORDER BY created_at DESC LIMIT ?')
      .all(limit) as HistoryRow[];
    return rows.map(rowToHistory);
  },

  create(input: HistoryInput): History {
    const createdAt: string = new Date().toISOString();
    const info = db
      .prepare('INSERT INTO history (tool_key, summary, created_at) VALUES (?, ?, ?)')
      .run(input.toolKey, input.summary, createdAt);
    const row = db
      .prepare('SELECT * FROM history WHERE id = ?')
      .get(info.lastInsertRowid) as HistoryRow;
    return rowToHistory(row);
  },

  remove(id: number): void {
    db.prepare('DELETE FROM history WHERE id = ?').run(id);
  },
};

export default historyRepo;
