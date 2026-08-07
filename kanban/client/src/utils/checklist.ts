import type { ChecklistItem } from '../types';

/** 检查清单进度统计结果。 */
export interface ChecklistProgress {
  /** 已勾选条目数。 */
  done: number;
  /** 条目总数。 */
  total: number;
  /** 完成百分比（0–100 的整数）；总数为 0 时为 0。 */
  percent: number;
}

/**
 * 统计检查清单完成进度（不修改入参）。
 * 入参非数组 / 空数组返回 {0,0,0}；只有 done === 1 计入已完成，
 * 与服务端 0/1 的整型语义保持一致（避免 truthy 判断把 2 之类的脏值算成完成）。
 */
export function checklistProgress(items: ChecklistItem[] | undefined | null): ChecklistProgress {
  if (!Array.isArray(items) || items.length === 0) return { done: 0, total: 0, percent: 0 };
  let done = 0;
  for (const it of items) {
    if (it?.done === 1) done++;
  }
  return { done, total: items.length, percent: Math.round((done / items.length) * 100) };
}

/**
 * 进度的紧凑文本，例如 "2/5"。清单为空时返回空串，
 * 便于调用方用 `text && <Chip .../>` 直接决定是否渲染。
 */
export function checklistSummaryText(items: ChecklistItem[] | undefined | null): string {
  const p = checklistProgress(items);
  if (p.total === 0) return '';
  return `${p.done}/${p.total}`;
}

/**
 * 清单是否全部完成（且非空）。
 * 空清单返回 false——「没有子任务」不等于「全部完成」，
 * 否则卡片会错误地显示成已达成状态。
 */
export function isChecklistComplete(items: ChecklistItem[] | undefined | null): boolean {
  const p = checklistProgress(items);
  return p.total > 0 && p.done === p.total;
}

/**
 * 计算追加新条目时应使用的 position（当前最大 position + 1）。
 * 空清单返回 0。服务端在缺省时也会追加到末尾，这里主要用于乐观更新时保持顺序一致。
 */
export function nextChecklistPosition(items: ChecklistItem[] | undefined | null): number {
  if (!Array.isArray(items) || items.length === 0) return 0;
  let max = -1;
  for (const it of items) {
    const p = Number(it?.position);
    if (Number.isFinite(p) && p > max) max = p;
  }
  return max + 1;
}
