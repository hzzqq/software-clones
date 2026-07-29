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

/** 返回按 index 升序的第一个未看剧集对象；全部看完或无剧集返回 null。
 * 相比仅依赖 watchedCount，直接读取真实剧集可避免「跳着看」时编号与卡片标签不一致。 */
export function nextEpisode(episodes: Episode[]): Episode | null {
  const sorted = [...episodes].sort((a, b) => a.index - b.index);
  for (const ep of sorted) {
    if (!ep.watched) return ep;
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

/**
 * 剧集观看进度可读摘要：「已看 X / 总 Y（Z%）」。
 * 用于详情页头部一行展示，替代散落的零散数字。纯函数，不修改入参。
 */
export function formatProgress(show: Show): string {
  const pct = progressPercent(show.watchedCount, show.totalEpisodes);
  return `已看 ${show.watchedCount} / ${show.totalEpisodes}（${pct}%）`;
}

/**
 * 夹回剧集总数：必须为有限且 >= 1 的整数；非法 / 负数 / 0 回退 fallback（默认 1）。
 * 用于新增剧集时的表单校验，修复「Number(form.totalEpisodes) || 1」对负数输入
 * 原样放行（如 -5 为真值）导致存储负集数的隐性 bug。
 */
export function clampEpisodeCount(raw: unknown, fallback = 1): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

/** 计算「接下来看」的下一集标签（纯函数，不修改入参）。
 * 入参为真实的下一集剧集对象：已看完（ep 为 null 或 total <= 0）返回「已看完」；
 * 否则返回「下一集 SxxExx」，编号取自剧集自身的 season/number（缺失时回退 index），
 * 因此与卡片正文展示的剧集编号始终一致，不再依赖 watchedCount 推断导致错位。 */
export function nextEpisodeLabel(ep: Episode | null, total: number): string {
  if (ep == null || total <= 0) return '已看完';
  return `下一集 ${formatEpisodeCode(ep.season ?? 1, ep.number ?? ep.index)}`;
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
  else arr.sort((a, b) => dateValue(b.updatedAt) - dateValue(a.updatedAt));
  return arr;
}

/** 将时间字符串安全转为时间戳；非法/空值回退为 0（最旧），避免 NaN 导致排序结果不确定。 */
function dateValue(s: string): number {
  const t = +new Date(s);
  return Number.isFinite(t) ? t : 0;
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

/** 整个片库的聚合观看统计，不修改入参。 */
export interface LibrarySummary {
  totalShows: number;
  watching: number;
  completed: number;
  totalEpisodes: number;
  watchedEpisodes: number;
  /** 整体完成度百分比（0-100，越界会被夹回）。 */
  overallPercent: number;
}

/**
 * 聚合整个片库的观看统计：剧集总数、进行中 / 已完结数量、累计集数与已看集数、
 * 以及整体完成度百分比。所有计数按非负处理，整体百分比交由 progressPercent 夹回，
 * 因此即使服务端返回了负的 watchedCount / totalEpisodes 也不会产生 NaN 或负占比。
 */
export function summarizeLibrary(shows: Show[]): LibrarySummary {
  let totalEpisodes = 0;
  let watchedEpisodes = 0;
  let completed = 0;
  let watching = 0;
  for (const s of shows) {
    totalEpisodes += Math.max(0, s.totalEpisodes);
    watchedEpisodes += Math.max(0, s.watchedCount);
    if (isComplete(s.watchedCount, s.totalEpisodes)) completed += 1;
    else watching += 1;
  }
  return {
    totalShows: shows.length,
    watching,
    completed,
    totalEpisodes,
    watchedEpisodes,
    overallPercent: progressPercent(watchedEpisodes, totalEpisodes),
  };
}

/**
 * 返回最近一次观看的剧集时间（ISO 字符串），未看任何剧集则返回 null。
 * 仅统计已看且 watchedAt 可解析为有限时间的剧集，忽略 null / 非法值，
 * 因此排序后的返回值可直接喂给 formatRelativeTime，不会渲染「Invalid Date」。
 */
export function lastWatchedAt(episodes: Episode[]): string | null {
  let best = -Infinity;
  for (const e of episodes) {
    if (!e.watched || e.watchedAt == null) continue;
    const t = Date.parse(e.watchedAt);
    if (Number.isFinite(t) && t > best) best = t;
  }
  return Number.isFinite(best) ? new Date(best).toISOString() : null;
}

/**
 * 按季统计集数分布，供剧集详情页展示「第 N 季 M 集」式的概览。
 * 对 season 做 Number.isFinite 防护，非有限值归入 0 季，避免 NaN 键污染统计。
 */
export function seasonEpisodeCount(episodes: Episode[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const ep of episodes) {
    const season = Number.isFinite(ep?.season) ? ep.season : 0;
    counts[season] = (counts[season] ?? 0) + 1;
  }
  return counts;
}
