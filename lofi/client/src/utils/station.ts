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
