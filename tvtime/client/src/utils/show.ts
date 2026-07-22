import type { Episode } from '../types';

/** 观看进度百分比（0-100，越界会被夹回合法区间）。 */
export function progressPercent(watched: number, total: number): number {
  if (total <= 0) return 0;
  const pct = Math.round((watched / total) * 100);
  return Math.max(0, Math.min(100, pct));
}

/** 返回第一个未观看的剧集序号（从 1 开始），全部看完则返回 null。 */
export function nextUnwatched(episodes: Episode[]): number | null {
  const sorted = [...episodes].sort((a, b) => a.index - b.index);
  for (const ep of sorted) {
    if (!ep.watched) return ep.index;
  }
  return null;
}

/** 是否已完结（全部已看）。 */
export function isComplete(watched: number, total: number): boolean {
  return total > 0 && watched >= total;
}
