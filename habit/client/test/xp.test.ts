import { describe, it, expect } from 'vitest';
import {
  XP_PER_CHECKIN,
  totalXp,
  xpForLevel,
  levelFromXp,
  progressToNextLevel,
} from '../src/utils/xp';

describe('xp utils', () => {
  it('每次打卡 +10 XP', () => {
    expect(XP_PER_CHECKIN).toBe(10);
    expect(totalXp(0)).toBe(0);
    expect(totalXp(1)).toBe(10);
    expect(totalXp(5)).toBe(50);
    expect(totalXp(30)).toBe(300);
  });

  it('等级阈值公式', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(xpForLevel(4)).toBe(600);
    expect(xpForLevel(5)).toBe(1000);
  });

  it('levelFromXp 边界', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(10)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(101)).toBe(2);
    expect(levelFromXp(299)).toBe(2);
    expect(levelFromXp(300)).toBe(3);
    expect(levelFromXp(600)).toBe(4);
    expect(levelFromXp(1000)).toBe(5);
  });

  it('levelFromXp 对负数视为 0', () => {
    expect(levelFromXp(-50)).toBe(1);
  });

  it('progressToNextLevel 返回等级与百分比', () => {
    // xp=0 → L1, 0%
    expect(progressToNextLevel(0)).toEqual({ level: 1, current: 0, needed: 100, percent: 0 });
    // xp=50 → L1, 50%
    expect(progressToNextLevel(50)).toEqual({ level: 1, current: 0, needed: 100, percent: 50 });
    // xp=100 → L2, 0%
    expect(progressToNextLevel(100)).toEqual({ level: 2, current: 100, needed: 300, percent: 0 });
    // xp=200 → L2, 50%
    expect(progressToNextLevel(200)).toEqual({ level: 2, current: 100, needed: 300, percent: 50 });
    // xp=999 → L4, 99% (600→1000, 399/400=99)
    expect(progressToNextLevel(999)).toEqual({ level: 4, current: 600, needed: 1000, percent: 99 });
  });
});
