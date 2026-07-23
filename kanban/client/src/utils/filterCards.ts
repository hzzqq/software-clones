import type { Card } from '../types';

/** Case-insensitive filter across title and description. */
export function filterCardsByQuery(query: string, cards: Card[]): Card[] {
  const q = query.trim().toLowerCase();
  if (!q) return cards;
  return cards.filter(
    (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  );
}

export type CardSort = 'position' | 'title' | 'priority' | 'dueDate' | 'updatedAt';

/**
 * 返回按指定字段排序的新数组（不修改入参）。
 * - position：按 position 升序（保持原顺序）
 * - title：按标题字典序
 * - priority：高优先级在前
 * - dueDate：升序，无截止日的排在最后
 * - updatedAt：最近更新在前
 */
export function sortCards(cards: Card[], by: CardSort = 'position'): Card[] {
  const arr = [...cards];
  arr.sort((a, b) => {
    switch (by) {
      case 'position':
        return a.position - b.position;
      case 'title':
        return a.title.localeCompare(b.title, 'zh');
      case 'priority':
        return b.priority - a.priority;
      case 'dueDate': {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate && !b.dueDate) return -1; // 有截止日的排在前
        if (!a.dueDate && b.dueDate) return 1;
        return 0; // 都无截止日，保持相对顺序
      }
      case 'updatedAt':
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });
  return arr;
}

/** 统计各优先级（数值）下的卡片数量，不修改入参。 */
export function countCardsByPriority(cards: Card[]): Record<number, number> {
  const map: Record<number, number> = {};
  for (const c of cards) {
    map[c.priority] = (map[c.priority] ?? 0) + 1;
  }
  return map;
}

/**
 * 临近到期（含已逾期）且未完成的卡片。
 * 条件：dueDate 非空、completed !== 1、且 dueDate ≤ now + withinDays 天。
 * 不修改入参。
 */
export function dueSoonCards(cards: Card[], withinDays = 3): Card[] {
  const horizon = Date.now() + withinDays * 24 * 60 * 60 * 1000;
  return cards.filter(
    (c) =>
      c.completed !== 1 &&
      c.dueDate !== null &&
      new Date(c.dueDate).getTime() <= horizon
  );
}

/**
 * 已逾期且未完成的卡片：dueDate < now 且 completed !== 1。
 * 与 dueSoonCards 的区别：这里只统计「已经过期」的部分（不含未来窗口内的临期项）。
 */
export function overdueCards(cards: Card[]): Card[] {
  const now = Date.now();
  return cards.filter(
    (c) => c.completed !== 1 && c.dueDate !== null && new Date(c.dueDate).getTime() < now
  );
}
