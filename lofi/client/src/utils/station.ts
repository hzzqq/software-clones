import { Station } from '../types';

export function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    lofi: 'Lo-fi',
    ambient: '氛围',
    chill: 'Chill',
    classical: '古典',
    focus: '专注',
  };
  return map[category] ?? category;
}

/** Case-insensitive search across station name + description. Blank query returns all. */
export function filterStations(query: string, list: Station[]): Station[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return list;
  return list.filter(
    (s) =>
      s.name.toLowerCase().includes(needle) ||
      (s.description ?? '').toLowerCase().includes(needle),
  );
}

export type StationSort = 'name' | 'category' | 'likes' | 'createdAt';

/**
 * 返回按指定字段排序的新数组（不修改入参）。
 * - name：按名称字典序
 * - category：按分类字典序
 * - likes：点赞数降序
 * - createdAt：最新在前
 */
export function sortStations(stations: Station[], by: StationSort = 'name'): Station[] {
  return [...stations].sort((a, b) => {
    switch (by) {
      case 'category':
        return a.category.localeCompare(b.category, 'zh');
      case 'likes':
        return b.likes - a.likes;
      case 'createdAt':
        return b.createdAt.localeCompare(a.createdAt);
      case 'name':
      default:
        return a.name.localeCompare(b.name, 'zh');
    }
  });
}

export function truncate(text: string, max = 80): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

/** 按分类分组（不修改入参），组内保持原始顺序。 */
export function groupStationsByCategory(stations: Station[]): Record<string, Station[]> {
  const map: Record<string, Station[]> = {};
  for (const s of stations) {
    (map[s.category] ||= []).push(s);
  }
  return map;
}

/** 按分类筛选（大小写不敏感）；分类为空或空白时返回全部。不修改入参。 */
export function filterStationsByCategory(stations: Station[], category: string): Station[] {
  const cat = (category ?? '').trim().toLowerCase();
  if (!cat) return stations;
  return stations.filter((s) => s.category.toLowerCase() === cat);
}

/** 仅保留点赞数 ≥ minLikes 的电台；minLikes ≤ 0 时返回原列表。不修改入参。 */
export function filterStationsByLikes(stations: Station[], minLikes = 0): Station[] {
  if (minLikes <= 0) return stations;
  return stations.filter((s) => s.likes >= minLikes);
}

/**
 * 将数字格式化为紧凑可读字符串（不修改入参）：
 * - NaN → '0'
 * - 负数 → '-' + formatCount(-n)
 * - < 1000 → 原数字字符串
 * - 1000..999999 → "x.xk"（保留 1 位小数）
 * - ≥ 1000000 → "x.xM"
 */
export function formatCount(n: number): string {
  if (Number.isNaN(n)) return '0';
  if (n < 0) return '-' + formatCount(-n);
  if (n < 1000) return String(n);
  if (n < 1000000) {
    const k = n / 1000;
    // 去掉 .0，呈现 1k / 1.5k，而非 1.0k
    return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`;
  }
  const m = n / 1000000;
  return `${m >= 10 ? Math.round(m) : Math.round(m * 10) / 10}M`;
}

/**
 * 将秒数格式化为播放时钟："m:ss"；≥1 小时为 "h:mm:ss"。
 * 非法 / 负数按 0 处理（显示 0:00）。用于播放条展示当前电台已收听时长。
 */
export function formatClock(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const s = Math.floor(totalSeconds);
  const sec = s % 60;
  const min = Math.floor(s / 60) % 60;
  const hr = Math.floor(s / 3600);
  const pad = (v: number) => String(v).padStart(2, '0');
  return hr > 0 ? `${hr}:${pad(min)}:${pad(sec)}` : `${min}:${pad(sec)}`;
}

/** 电台统计概览。 */
export interface StationsSummary {
  total: number;
  categories: number;
  totalLikes: number;
}

/** 汇总电台：总数、分类数、总点赞数（不修改入参）。 */
export function summarizeStations(stations: Station[]): StationsSummary {
  const cats = new Set<string>();
  let totalLikes = 0;
  for (const s of stations) {
    if (s.category) cats.add(s.category);
    totalLikes += s.likes ?? 0;
  }
  return { total: stations.length, categories: cats.size, totalLikes };
}
