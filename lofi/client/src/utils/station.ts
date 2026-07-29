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

export type StationSort = 'name' | 'category' | 'likes' | 'createdAt' | 'shuffle';

/**
 * 返回按指定字段排序的新数组（不修改入参）。
 * - name：按名称字典序
 * - category：按分类字典序
 * - likes：点赞数降序
 * - createdAt：最新在前（缺失值视为空串，避免 localeCompare 抛错）
 * - shuffle：Fisher-Yates 随机洗牌（见 shuffleStations）
 */
export function sortStations(stations: Station[], by: StationSort = 'name'): Station[] {
  return [...stations].sort((a, b) => {
    switch (by) {
      case 'category':
        return (a.category ?? '').localeCompare(b.category ?? '', 'zh');
      case 'likes':
        return b.likes - a.likes;
      case 'createdAt':
        return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
      case 'name':
      default:
        return (a.name ?? '').localeCompare(b.name ?? '', 'zh');
    }
  });
}

/**
 * Fisher-Yates 洗牌，返回新数组（不修改入参）。
 * rng 可注入以便确定性测试；默认 Math.random。
 */
export function shuffleStations(stations: Station[], rng: () => number = Math.random): Station[] {
  const arr = [...stations];
  for (let i = 0; i < arr.length - 1; i++) {
    const span = arr.length - i;
    const j = Math.min(arr.length - 1, i + Math.floor(rng() * span));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 截断文本并以省略号结尾（不修改入参）。
 * - null/undefined/空串 → 返回 ''（避免 StationCard 渲染 null 描述时
 *   text.length 抛 TypeError 的隐性崩溃，与 filterStations 的 `?? ''` 防御风格一致）。
 * - 长度 ≤ max → 原样返回。
 */
export function truncate(text: string | null | undefined, max = 80): string {
  if (!text) return '';
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

/**
 * 按分类统计电台数量，返回 分类 -> 电台数 的映射（与 groupStationsByCategory 互补）。
 * 纯函数，不修改入参；用于分类筛选 Chip 实时展示各分类电台数。
 */
export function countStationsByCategory(stations: Station[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of stations ?? []) {
    if (typeof s.category !== 'string') continue;
    map[s.category] = (map[s.category] ?? 0) + 1;
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

/**
 * 将 ISO 时间戳格式化为中文相对时间：
 *   刚刚 / x分钟前 / x小时前 / x天前 / x个月前 / x年前
 * - 空串或非法日期 → 返回 ''（调用方据此决定是否展示），避免渲染 "Invalid Date"。
 * - 未来时间（时钟偏差）回退为 "刚刚"。
 * - now 可注入以便确定性测试，默认 Date.now()。纯函数，不修改入参。
 */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const v = (iso ?? '').trim();
  if (!v) return '';
  const then = new Date(v).getTime();
  if (!Number.isFinite(then)) return '';
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return '刚刚';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}天前`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}个月前`;
  const year = Math.floor(day / 365);
  return `${year}年前`;
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

/**
 * 校验电台流地址是否合法：非空，且为 http/https 协议（播放器仅支持标准流）。
 * 返回 boolean，纯函数。用于新增/编辑电台的客户端前置校验，避免创建非法流地址
 * 导致播放器静默失败（此前 handleAdd 仅判空即可创建，隐性 bug）。
 */
export function validateStreamUrl(url: string): boolean {
  const v = (url ?? '').trim();
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
