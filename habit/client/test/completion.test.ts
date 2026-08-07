import { describe, it, expect } from 'vitest';
import { monthCompletion } from '../src/utils/completion';

describe('monthCompletion', () => {
  it('当前月按已过去的天数计算分母', () => {
    const checked = new Set(['2025-08-01', '2025-08-02']);
    // 今天 8/6 → total=6, completed=2 → 33%
    expect(monthCompletion(checked, 2025, 7, '2025-08-06')).toEqual({
      completed: 2,
      total: 6,
      percent: 33,
    });
  });

  it('过去月份按整月天数计算', () => {
    const checked = new Set(['2025-07-01', '2025-07-31']);
    expect(monthCompletion(checked, 2025, 6, '2025-08-06')).toEqual({
      completed: 2,
      total: 31,
      percent: 6,
    });
  });

  it('未来月份按整月天数计算（尚未打卡）', () => {
    expect(monthCompletion(new Set(), 2025, 9, '2025-08-06')).toEqual({
      completed: 0,
      total: 31,
      percent: 0,
    });
  });

  it('全部打卡 → 100%', () => {
    const checked = new Set(['2025-08-01', '2025-08-02', '2025-08-03']);
    expect(monthCompletion(checked, 2025, 7, '2025-08-03')).toEqual({
      completed: 3,
      total: 3,
      percent: 100,
    });
  });

  it('百分比四舍五入', () => {
    // 1/3 = 33.33 → 33；2/3 = 66.66 → 67
    expect(monthCompletion(new Set(['2025-08-01']), 2025, 7, '2025-08-03').percent).toBe(33);
    expect(monthCompletion(new Set(['2025-08-01', '2025-08-02']), 2025, 7, '2025-08-03').percent).toBe(67);
  });

  it('2 月按 28/29 天', () => {
    expect(monthCompletion(new Set(), 2025, 1, '2025-08-06').total).toBe(28);
    expect(monthCompletion(new Set(), 2024, 1, '2025-08-06').total).toBe(29);
  });
});
