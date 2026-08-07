import { db } from '../db';

/** 卡片检查清单条目（子任务）。 */
export interface ChecklistItem {
  id: number;
  cardId: number;
  text: string;
  done: number;
  position: number;
  createdAt: string;
}

export interface ChecklistItemRow {
  id: number;
  card_id: number;
  text: string;
  done: number;
  position: number;
  created_at: string;
}

export function rowToChecklistItem(row: ChecklistItemRow): ChecklistItem {
  return {
    id: row.id,
    cardId: row.card_id,
    text: row.text,
    done: row.done,
    position: row.position,
    createdAt: row.created_at,
  };
}

export interface ChecklistItemInput {
  cardId: number;
  text: string;
  position?: number;
  done?: number;
}

export type ChecklistItemPatch = Partial<{
  text: string;
  done: number;
  position: number;
}>;

/** Data-access layer for card checklist items. */
export const checklistRepo = {
  /** 某张卡片的全部子任务，按 position 升序。 */
  listByCard(cardId: number): ChecklistItem[] {
    const rows = db
      .prepare('SELECT * FROM checklist_item WHERE card_id = ? ORDER BY position ASC, id ASC')
      .all(cardId) as ChecklistItemRow[];
    return rows.map(rowToChecklistItem);
  },

  /** 批量取多张卡片的子任务，返回 cardId → items 的映射（用于看板聚合视图，避免 N+1）。 */
  listByCards(cardIds: number[]): Record<number, ChecklistItem[]> {
    const map: Record<number, ChecklistItem[]> = {};
    if (cardIds.length === 0) return map;
    const placeholders: string = cardIds.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT * FROM checklist_item WHERE card_id IN (${placeholders}) ORDER BY position ASC, id ASC`
      )
      .all(...cardIds) as ChecklistItemRow[];
    for (const row of rows) {
      (map[row.card_id] ??= []).push(rowToChecklistItem(row));
    }
    return map;
  },

  getById(id: number): ChecklistItem | undefined {
    const row = db.prepare('SELECT * FROM checklist_item WHERE id = ?').get(id) as
      | ChecklistItemRow
      | undefined;
    return row ? rowToChecklistItem(row) : undefined;
  },

  create(input: ChecklistItemInput): ChecklistItem {
    const now: string = new Date().toISOString();
    const position: number =
      typeof input.position === 'number' ? input.position : this.listByCard(input.cardId).length;
    const info = db
      .prepare(
        'INSERT INTO checklist_item (card_id, text, done, position, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(input.cardId, input.text, input.done ?? 0, position, now);
    return this.getById(Number(info.lastInsertRowid))!;
  },

  update(id: number, patch: ChecklistItemPatch): ChecklistItem | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;
    const text: string = patch.text ?? existing.text;
    const done: number = patch.done ?? existing.done;
    const position: number = patch.position ?? existing.position;
    db.prepare('UPDATE checklist_item SET text = ?, done = ?, position = ? WHERE id = ?').run(
      text,
      done,
      position,
      id
    );
    return this.getById(id);
  },

  remove(id: number): void {
    db.prepare('DELETE FROM checklist_item WHERE id = ?').run(id);
  },
};

export default checklistRepo;
