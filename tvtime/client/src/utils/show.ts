import type { Episode, Show } from '../types';

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

/** 剩余集数（已看超过总数时返回 0，不会为负）。 */
export function episodesLeft(show: Show): number {
  const left = show.totalEpisodes - show.watchedCount;
  return left > 0 ? left : 0;
}

/** 估算剩余观看时长（秒）；secPerEp 为单集时长，默认 45 分钟。 */
export function remainingWatchTime(show: Show, secPerEp = 45 * 60): number {
  return episodesLeft(show) * secPerEp;
}

/** 将秒数格式化为「X 小时 Y 分」中文时长描述。 */
export function formatWatchTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0 分钟';
  const minutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return mins > 0 ? `${hours} 小时 ${mins} 分` : `${hours} 小时`;
  return `${minutes} 分钟`;
}

/** 按名称过滤剧集（空白匹配全部，忽略大小写）。 */
export function filterShows(query: string, shows: Show[]): Show[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return shows;
  return shows.filter((s) => s.title.toLowerCase().includes(needle));
}

export type ShowSort = 'title' | 'progress' | 'updated';

/** 剧集排序：按名称 / 观看进度 / 最近更新。 */
export function sortShows(shows: Show[], by: ShowSort): Show[] {
  const arr = [...shows];
  if (by === 'title') arr.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
  else if (by === 'progress')
    arr.sort(
      (a, b) =>
        progressPercent(b.watchedCount, b.totalEpisodes) -
        progressPercent(a.watchedCount, a.totalEpisodes),
    );
  else arr.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  return arr;
}
