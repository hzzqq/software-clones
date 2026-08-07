import { describe, it, expect } from 'vitest';
import {
  computeDailyStreak,
  longestDailyStreak,
  completedWeeks,
  computeWeeklyStreak,
} from '../src/utils/streak';
import { isoWeekKey } from '../src/utils/date';

describe('computeDailyStreak', () => {
  it('空集合返回 0', () => {
    expect(computeDailyStreak(new Set(), '2025-08-06')).toBe(0);
  });

  it('今天已打卡：从今天向前连续计数', () => {
    const dates = new Set(['2025-08-04', '2025-08-05', '2025-08-06']);
    expect(computeDailyStreak(dates, '2025-08-06')).toBe(3);
  });

  it('今天未打卡：从昨天向前连续计数（不因今天未打而清零）', () => {
    const dates = new Set(['2025-08-03', '2025-08-04', '2025-08-05']);
    expect(computeDailyStreak(dates, '2025-08-06')).toBe(3);
  });

  it('中断：昨天缺卡则从昨天开始重算（昨天也未打卡 → 0）', () => {
    const dates = new Set(['2025-08-03', '2025-08-04']);
    expect(computeDailyStreak(dates, '2025-08-06')).toBe(0);
  });

  it('中断：前天断卡则只数昨天到今天', () => {
    const dates = new Set(['2025-08-04', '2025-08-06']);
    expect(computeDailyStreak(dates, '2025-08-06')).toBe(1);
  });

  it('跨月连续（7 月底 → 8 月初）', () => {
    const dates = new Set(['2025-07-30', '2025-07-31', '2025-08-01', '2025-08-02']);
    expect(computeDailyStreak(dates, '2025-08-02')).toBe(4);
  });

  it('跨年连续（12 月底 → 1 月初）', () => {
    const dates = new Set(['2024-12-30', '2024-12-31', '2025-01-01']);
    expect(computeDailyStreak(dates, '2025-01-01')).toBe(3);
  });
});

describe('longestDailyStreak', () => {
  it('空集合返回 0', () => {
    expect(longestDailyStreak(new Set())).toBe(0);
  });

  it('找出历史最长连续段（乱序输入）', () => {
    const dates = new Set(['2025-08-01', '2025-07-29', '2025-07-30', '2025-07-31', '2025-08-03', '2025-08-02']);
    // 集合内 07-29..08-03 共 6 天全部连续，故最长连续段为 6
    expect(longestDailyStreak(dates)).toBe(6);
  });

  it('全部孤立返回 1', () => {
    const dates = new Set(['2025-08-01', '2025-08-03', '2025-08-05']);
    expect(longestDailyStreak(dates)).toBe(1);
  });
});

describe('completedWeeks', () => {
  it('按 ISO 周聚合，达到 targetCount 才记为完成周', () => {
    const dates = new Set([
      '2025-07-28', // 周一 2025-W31
      '2025-07-29', // 周二
      '2025-08-04', // 周一 2025-W32
      '2025-08-05', // 周二
    ]);
    const weeks = completedWeeks(dates, 2);
    expect(weeks.has('2025-W31')).toBe(true);
    expect(weeks.has('2025-W32')).toBe(true);
  });

  it('未达到 targetCount 的周不算完成', () => {
    const dates = new Set(['2025-08-04']);
    const weeks = completedWeeks(dates, 2);
    expect(weeks.has('2025-W32')).toBe(false);
  });

  it('跨年周正确归属（2024 年底的周）', () => {
    const dates = new Set(['2024-12-30', '2024-12-31', '2025-01-01']);
    // 2024-12-30 属于 2025-W01（ISO 规则）
    expect(isoWeekKey('2024-12-30')).toBe('2025-W01');
    const weeks = completedWeeks(dates, 3);
    expect(weeks.has('2025-W01')).toBe(true);
  });
});

describe('computeWeeklyStreak', () => {
  it('连续完成多周', () => {
    const weeks = new Set(['2025-W31', '2025-W32', '2025-W33']);
    expect(computeWeeklyStreak(weeks, '2025-W33')).toBe(3);
  });

  it('本周未完成则从上周末尾开始数', () => {
    const weeks = new Set(['2025-W30', '2025-W31', '2025-W32']);
    expect(computeWeeklyStreak(weeks, '2025-W33')).toBe(3);
  });

  it('中断后重算', () => {
    const weeks = new Set(['2025-W30', '2025-W31', '2025-W33']);
    expect(computeWeeklyStreak(weeks, '2025-W33')).toBe(1);
  });

  it('跨年周连续', () => {
    const weeks = new Set(['2025-W52', '2026-W01', '2026-W02']);
    expect(computeWeeklyStreak(weeks, '2026-W02')).toBe(3);
  });
});
