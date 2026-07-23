import { describe, it, expect } from 'vitest';
import { progressPercent, nextUnwatched, isComplete, filterShows, sortShows, episodesLeft, remainingWatchTime, formatWatchTime, filterEpisodesByWatched } from './show';
import type { Episode, Show } from '../types';

function mkShow(id: number, title: string, watchedCount: number, totalEpisodes: number, updatedAt: string): Show {
  return { id, title, note: '', totalEpisodes, watchedCount, createdAt: '', updatedAt };
}

function ep(index: number, watched: boolean): Episode {
  return {
    id: index,
    showId: 1,
    index,
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
