import { describe, it, expect } from 'vitest';
import { progressPercent, nextUnwatched, nextEpisode, isComplete, filterShows, sortShows, episodesLeft, remainingWatchTime, formatWatchTime, filterEpisodesByWatched, episodesByStatus, formatProgress, clampEpisodeCount, nextEpisodeLabel } from './show';
import type { Episode, Show } from '../types';

function mkShow(id: number, title: string, watchedCount: number, totalEpisodes: number, updatedAt: string): Show {
  return { id, title, note: '', totalEpisodes, watchedCount, createdAt: '', updatedAt };
}

function ep(index: number, watched: boolean, season?: number, number?: number): Episode {
  return {
    id: index,
    showId: 1,
    index,
    season,
    number,
    watched,
    watchedAt: null,
    createdAt: '',
    updatedAt: '',
  };
}

describe('progressPercent', () => {
  it('正常比例', () => {
    expect(progressPercent(5, 10)).toBe(50);
  });
  it('总数为 0 时返回 0', () => {
    expect(progressPercent(0, 0)).toBe(0);
  });
  it('已看超过总数时夹回 100', () => {
    expect(progressPercent(12, 10)).toBe(100);
  });
  it('负数已看夹回 0', () => {
    expect(progressPercent(-3, 10)).toBe(0);
  });
});

describe('nextUnwatched', () => {
  it('返回第一个未看', () => {
    const eps = [ep(1, true), ep(2, false), ep(3, false)];
    expect(nextUnwatched(eps)).toBe(2);
  });
  it('乱序时仍返回最小的未看序号', () => {
    const eps = [ep(3, false), ep(1, true), ep(2, true)];
    expect(nextUnwatched(eps)).toBe(3);
  });
  it('全部看完返回 null', () => {
    expect(nextUnwatched([ep(1, true), ep(2, true)])).toBeNull();
  });
  it('空列表返回 null', () => {
    expect(nextUnwatched([])).toBeNull();
  });
});

describe('isComplete', () => {
  it('完结', () => {
    expect(isComplete(10, 10)).toBe(true);
  });
  it('未完结', () => {
    expect(isComplete(9, 10)).toBe(false);
  });
});

describe('episodesLeft', () => {
  it('正常剩余', () => {
    expect(episodesLeft(mkShow(1, 'x', 7, 12, ''))).toBe(5);
  });
  it('全部看完返回 0', () => {
    expect(episodesLeft(mkShow(1, 'x', 12, 12, ''))).toBe(0);
  });
  it('已看超过总数返回 0', () => {
    expect(episodesLeft(mkShow(1, 'x', 15, 12, ''))).toBe(0);
  });
});

describe('filterShows', () => {
  const shows = [mkShow(1, 'Breaking Bad', 5, 10, ''), mkShow(2, '绝命毒师前传', 3, 10, '')];
  it('空白匹配全部', () => {
    expect(filterShows('', shows)).toHaveLength(2);
  });
  it('按名称匹配（忽略大小写）', () => {
    expect(filterShows('BREAKING', shows).map((s) => s.id)).toEqual([1]);
    expect(filterShows('绝命', shows).map((s) => s.id)).toEqual([2]);
  });
});

describe('sortShows', () => {
  const shows = [
    mkShow(1, 'Beta', 2, 10, '2026-01-01'),
    mkShow(2, 'Alpha', 9, 10, '2026-03-01'),
    mkShow(3, 'Gamma', 5, 10, '2026-02-01'),
  ];
  it('按名称', () => {
    expect(sortShows(shows, 'title').map((s) => s.id)).toEqual([2, 1, 3]);
  });
  it('按进度（高到低）', () => {
    expect(sortShows(shows, 'progress').map((s) => s.id)).toEqual([2, 3, 1]);
  });
  it('按更新时间（新到旧）', () => {
    expect(sortShows(shows, 'updated').map((s) => s.id)).toEqual([2, 3, 1]);
  });
  it('非法/空 updatedAt 不破坏排序（视为最旧排末位）', () => {
    const mixed = [
      mkShow(1, 'A', 1, 10, 'not-a-date'),
      mkShow(2, 'B', 1, 10, ''),
      mkShow(3, 'C', 1, 10, '2026-03-01'),
      mkShow(4, 'D', 1, 10, '2026-02-01'),
    ];
    expect(sortShows(mixed, 'updated').map((s) => s.id)).toEqual([3, 4, 1, 2]);
  });
});

describe('remainingWatchTime', () => {
  it('剩余集数 × 单集时长（默认 45 分钟）', () => {
    const s = mkShow(1, 'X', 3, 10, '2026-01-01');
    expect(remainingWatchTime(s)).toBe(7 * 45 * 60);
  });
  it('自定义单集时长', () => {
    const s = mkShow(2, 'Y', 8, 10, '2026-01-01');
    expect(remainingWatchTime(s, 30 * 60)).toBe(2 * 30 * 60);
  });
  it('已看完返回 0', () => {
    const s = mkShow(3, 'Z', 10, 10, '2026-01-01');
    expect(remainingWatchTime(s)).toBe(0);
  });
});

describe('formatWatchTime', () => {
  it('不足 1 小时显示分钟', () => {
    expect(formatWatchTime(45 * 60)).toBe('45 分钟');
  });
  it('整小时', () => {
    expect(formatWatchTime(2 * 60 * 60)).toBe('2 小时');
  });
  it('小时 + 分钟', () => {
    expect(formatWatchTime((2 * 60 + 15) * 60)).toBe('2 小时 15 分');
  });
  it('非正返回 0 分钟', () => {
    expect(formatWatchTime(0)).toBe('0 分钟');
  });
});

describe('filterEpisodesByWatched', () => {
  const eps = [ep(1, true), ep(2, false), ep(3, true), ep(4, false)];
  it('all 返回全部', () => {
    expect(filterEpisodesByWatched(eps, 'all')).toHaveLength(4);
  });
  it('仅已看', () => {
    expect(filterEpisodesByWatched(eps, 'watched').map((e) => e.index)).toEqual([1, 3]);
  });
  it('仅未看', () => {
    expect(filterEpisodesByWatched(eps, 'unwatched').map((e) => e.index)).toEqual([2, 4]);
  });
  it('默认参数为 all', () => {
    expect(filterEpisodesByWatched(eps)).toHaveLength(4);
  });
  it('不修改入参', () => {
    filterEpisodesByWatched(eps, 'watched');
    expect(eps).toHaveLength(4);
  });
});

describe('episodesByStatus', () => {
  const eps = [ep(1, true), ep(2, false), ep(3, true), ep(4, false)];
  it('统计已看/未看/总数', () => {
    expect(episodesByStatus(eps)).toEqual({ watched: 2, unwatched: 2, total: 4 });
  });
  it('全未看', () => {
    expect(episodesByStatus([ep(1, false), ep(2, false)])).toEqual({ watched: 0, unwatched: 2, total: 2 });
  });
  it('全已看', () => {
    expect(episodesByStatus([ep(1, true), ep(2, true)])).toEqual({ watched: 2, unwatched: 0, total: 2 });
  });
  it('空列表', () => {
    expect(episodesByStatus([])).toEqual({ watched: 0, unwatched: 0, total: 0 });
  });
  it('不修改入参', () => {
    episodesByStatus(eps);
    expect(eps).toHaveLength(4);
  });
});

describe('formatProgress', () => {
  const show: Show = { id: 1, title: 'X', note: '', totalEpisodes: 12, watchedCount: 3, createdAt: '', updatedAt: '' };
  it('生成「已看 X / 总 Y（Z%）」', () => {
    expect(formatProgress(show)).toBe('已看 3 / 12（25%）');
  });
  it('全部看完为 100%', () => {
    expect(formatProgress({ ...show, watchedCount: 12 })).toBe('已看 12 / 12（100%）');
  });
  it('总集为 0 不崩溃', () => {
    expect(formatProgress({ ...show, totalEpisodes: 0, watchedCount: 0 })).toBe('已看 0 / 0（0%）');
  });
});

describe('clampEpisodeCount', () => {
  it('正常正整数原样', () => {
    expect(clampEpisodeCount(12)).toBe(12);
    expect(clampEpisodeCount('8')).toBe(8);
  });
  it('负数/0 回退 fallback', () => {
    expect(clampEpisodeCount(-5)).toBe(1);
    expect(clampEpisodeCount(0)).toBe(1);
  });
  it('非数字回退 fallback', () => {
    expect(clampEpisodeCount('abc')).toBe(1);
    expect(clampEpisodeCount(NaN)).toBe(1);
    expect(clampEpisodeCount(undefined)).toBe(1);
  });
  it('支持自定义 fallback 与取整', () => {
    expect(clampEpisodeCount(3.9, 4)).toBe(3);
    expect(clampEpisodeCount(-1, 4)).toBe(4);
  });
});

describe('nextEpisode', () => {
  it('返回按 index 升序的第一个未看剧集对象', () => {
    const eps = [ep(1, true), ep(2, false), ep(3, false)];
    expect(nextEpisode(eps)).toEqual(ep(2, false));
  });
  it('乱序时仍返回 index 最小且未看的那一集', () => {
    const eps = [ep(3, false), ep(1, true), ep(2, true)];
    expect(nextEpisode(eps)?.index).toBe(3);
  });
  it('优先使用剧集自身的 season/number（而非 index）', () => {
    const eps = [ep(5, false, 2, 3)];
    expect(nextEpisode(eps)?.season).toBe(2);
    expect(nextEpisode(eps)?.number).toBe(3);
  });
  it('全部看完返回 null', () => {
    expect(nextEpisode([ep(1, true), ep(2, true)])).toBeNull();
  });
  it('空列表返回 null', () => {
    expect(nextEpisode([])).toBeNull();
  });
});

describe('nextEpisodeLabel', () => {
  it('已看完（ep 为 null）返回「已看完」', () => {
    expect(nextEpisodeLabel(null, 10)).toBe('已看完');
  });
  it('总数非法时返回「已看完」', () => {
    expect(nextEpisodeLabel(ep(1, false), 0)).toBe('已看完');
  });
  it('默认用 index 拼出 S01Exx 编号', () => {
    expect(nextEpisodeLabel(ep(3, false), 10)).toBe('下一集 S01E03');
  });
  it('优先用 season/number 拼编号，避免与卡片正文错位', () => {
    expect(nextEpisodeLabel(ep(5, false, 2, 9), 10)).toBe('下一集 S02E09');
  });
  it('不修改入参', () => {
    const e = ep(2, false, 1, 4);
    nextEpisodeLabel(e, 10);
    expect(e.watched).toBe(false);
    expect(e.index).toBe(2);
  });
});

