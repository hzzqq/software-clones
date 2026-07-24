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

/**
 * 按优先级精确筛选（不修改入参）。
 * priority 为 null 时返回全部；否则只保留 c.priority === priority 的卡片。
 */
export function filterCardsByPriority(cards: Card[], priority: number | null): Card[] {
  if (priority === null) return cards;
  return cards.filter((c) => c.priority === priority);
}

/**
 * 按完成状态筛选（不修改入参）。
 * onlyIncomplete 为 true 时只保留未完成（completed !== 1）的卡片；
 * 为 false 时返回全部。
 */
export function filterCardsByCompleted(cards: Card[], onlyIncomplete: boolean): Card[] {
  if (!onlyIncomplete) return cards;
  return cards.filter((c) => c.completed !== 1);
}

/** 截止日语义色调：已逾期 / 今天 / 临近 / 无。 */
export type DueTone = 'overdue' | 'today' | 'soon' | 'none';

/** 截止日标签结果：展示文本 + 语义色调。 */
export interface DueLabel {
  text: string;
  tone: DueTone;
}

/**
 * 根据截止日（ISO 字符串或 null）与「参考时间」生成人类可读标签与语义色调。
 * - null                     → 无截止 / none
 * - 日期早于今天（已过期）   → 逾期 n天 / overdue
 * - 今天（同日历日）         → 今天 / today
 * - 3 天内（含）             → n天后 / soon
 * - 其余未来                 → n天后 / none
 * 仅按日期比较（忽略当天具体时刻），不修改入参。
 * 第二个可选参数 now 用于测试时固定参考时间；缺省使用真实 Date。
 */
export function formatDueLabel(dueDate: string | null, now: Date = new Date()): DueLabel {
  if (dueDate === null) return { text: '无截止', tone: 'none' };

  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfDay(new Date(dueDate)).getTime() - startOfDay(now).getTime()) / msPerDay
  );

  if (diffDays < 0) return { text: `逾期 ${Math.abs(diffDays)}天`, tone: 'overdue' };
  if (diffDays === 0) return { text: '今天', tone: 'today' };
  if (diffDays <= 3) return { text: `${diffDays}天后`, tone: 'soon' };
  return { text: `${diffDays}天后`, tone: 'none' };
}
