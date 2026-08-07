import { db } from '../db';
import { Card, CardRow, rowToCard } from './boardRepo';
import { checklistRepo } from './checklistRepo';
import { activityRepo } from './activityRepo';

export interface CardInput {
  listId: number;
  title: string;
  position: number;
  description?: string;
  dueDate?: string | null;
  priority?: number;
  completed?: number;
  assignee?: string;
}

export type CardPatch = Partial<{
  title: string;
  description: string;
  dueDate: string | null;
  priority: number;
  completed: number;
  assignee: string;
  position: number;
  listId: number;
}>;

/** 为卡片补齐关联数据（标签 id 列表 + 子任务清单 + 评论数）。 */
function hydrate(card: Card): Card {
  const tags = db
    .prepare('SELECT tag_id FROM card_tag WHERE card_id = ?')
    .all(card.id) as Array<{ tag_id: number }>;
  card.tagIds = tags.map((t) => t.tag_id);
  card.checklist = checklistRepo.listByCard(card.id);
  card.commentCount = activityRepo.countComments(card.id);
  return card;
}

/** Data-access layer for cards. Position is an integer sort key. */
export const cardRepo = {
  create(input: CardInput): Card {
    const now: string = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO card (list_id, title, description, due_date, priority, completed, assignee, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.listId,
        input.title,
        input.description ?? '',
        input.dueDate ?? null,
        input.priority ?? 0,
        input.completed ?? 0,
        input.assignee ?? '',
        input.position,
        now,
        now
      );
    const row = db.prepare('SELECT * FROM card WHERE id = ?').get(info.lastInsertRowid) as CardRow;
    return hydrate(rowToCard(row));
  },

  getById(id: number): Card | undefined {
    const row = db.prepare('SELECT * FROM card WHERE id = ?').get(id) as CardRow | undefined;
    if (!row) return undefined;
    return hydrate(rowToCard(row));
  },

  /**
   * 局部更新卡片。
   *
   * 注意：SET 子句的列顺序与 run() 的实参顺序必须严格一致——历史实现里
   * `list_id/title/description/...` 与 `title, description, dueDate, ..., listId`
   * 存在错位，导致 description 收到 due_date（可能为 NULL）而触发
   * `NOT NULL constraint failed: card.description`，并把 title 写进 list_id。
   * 此处按 SET 顺序逐一传参，杜绝同类错位。
   */
  update(id: number, patch: CardPatch): Card | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;
    const listId: number = patch.listId ?? existing.listId;
    const title: string = patch.title ?? existing.title;
    const description: string = patch.description ?? existing.description;
    const dueDate: string | null = patch.dueDate === undefined ? existing.dueDate : patch.dueDate;
    const priority: number = patch.priority ?? existing.priority;
    const completed: number = patch.completed ?? existing.completed;
    const assignee: string = patch.assignee ?? existing.assignee;
    const position: number = patch.position ?? existing.position;
    const updatedAt: string = new Date().toISOString();
    db.prepare(
      `UPDATE card
         SET list_id = ?, title = ?, description = ?, due_date = ?, priority = ?,
             completed = ?, assignee = ?, position = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      listId,
      title,
      description,
      dueDate,
      priority,
      completed,
      assignee,
      position,
      updatedAt,
      id
    );
    return this.getById(id);
  },

  remove(id: number): void {
    db.prepare('DELETE FROM card WHERE id = ?').run(id);
  },

  listByList(listId: number): Card[] {
    const rows = db
      .prepare('SELECT * FROM card WHERE list_id = ? ORDER BY position ASC')
      .all(listId) as CardRow[];
    return rows.map((row) => hydrate(rowToCard(row)));
  },

  /** 某列当前的卡片数量（批量移动时用于计算追加起点，避免整表 hydrate）。 */
  countByList(listId: number): number {
    const row = db
      .prepare('SELECT COUNT(*) AS n FROM card WHERE list_id = ?')
      .get(listId) as { n: number } | undefined;
    return row?.n ?? 0;
  },

  /**
   * 批量删除，返回实际删除条数。整批放进一个事务：
   * 批量操作要么全成、要么全不成，避免中途失败留下半清空的列。
   */
  bulkRemove(ids: number[]): number {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const stmt = db.prepare('DELETE FROM card WHERE id = ?');
    const run = db.transaction((targets: number[]): number => {
      let n = 0;
      for (const id of targets) n += stmt.run(id).changes;
      return n;
    });
    return run(ids);
  },

  /** 批量设置完成状态（0/1），返回实际更新条数。 */
  bulkSetCompleted(ids: number[], completed: number): number {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const flag: number = completed === 1 ? 1 : 0;
    const stmt = db.prepare('UPDATE card SET completed = ?, updated_at = ? WHERE id = ?');
    const run = db.transaction((targets: number[]): number => {
      const now: string = new Date().toISOString();
      let n = 0;
      for (const id of targets) n += stmt.run(flag, now, id).changes;
      return n;
    });
    return run(ids);
  },

  /**
   * 批量移动到目标列末尾，按传入顺序依次追加 position，返回实际移动条数。
   * startPosition 由调用方给出（通常是目标列现有卡片数），保证不与既有卡片撞位。
   */
  bulkMove(ids: number[], targetListId: number, startPosition: number): number {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const base: number =
      Number.isFinite(startPosition) && startPosition > 0 ? Math.floor(startPosition) : 0;
    const stmt = db.prepare(
      'UPDATE card SET list_id = ?, position = ?, updated_at = ? WHERE id = ?'
    );
    const run = db.transaction((targets: number[]): number => {
      const now: string = new Date().toISOString();
      let n = 0;
      targets.forEach((id, index) => {
        n += stmt.run(targetListId, base + index, now, id).changes;
      });
      return n;
    });
    return run(ids);
  },
};

export default cardRepo;
