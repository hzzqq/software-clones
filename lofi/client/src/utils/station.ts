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

export function truncate(text: string, max = 80): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}
