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

/** 将季/集编号格式化为「S01E02」编码；位数不足补零，0 也会照常补零（如 (0,0)→'S00E00'）。 */
export function formatEpisodeCode(season: number, episode: number): string {
  const s = String(season).padStart(2, '0');
  const e = String(episode).padStart(2, '0');
  return `S${s}E${e}`;
}

/** 计算「接下来看」的下一集标签（纯函数，不修改入参）。
 * 已看完（watched >= total 或 total <= 0）返回「已看完」；
 * 否则返回「下一集 第 N 集」（N = watched + 1）。 */
export function nextEpisodeLabel(watched: number, total: number): string {
  if (total <= 0 || watched >= total) return '已看完';
  return `下一集 第 ${watched + 1} 集`;
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

/** 剧集观看状态筛选维度。 */
export type EpisodeFilter = 'all' | 'watched' | 'unwatched';

/** 按观看状态筛选剧集：'all' 返回全部；'watched' 仅已看；'unwatched' 仅未看。 */
export function filterEpisodesByWatched(episodes: Episode[], filter: EpisodeFilter = 'all'): Episode[] {
  if (filter === 'all') return episodes;
  return episodes.filter((e) => (filter === 'watched' ? e.watched : !e.watched));
}

/** 剧集观看状态计数（已看 / 未看 / 总数），不修改入参。 */
export interface EpisodeStatusCount {
  watched: number;
  unwatched: number;
  total: number;
}

export function episodesByStatus(episodes: Episode[]): EpisodeStatusCount {
  let watched = 0;
  for (const e of episodes) {
    if (e.watched) watched += 1;
  }
  return { watched, unwatched: episodes.length - watched, total: episodes.length };
}
