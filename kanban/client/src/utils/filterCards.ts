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
