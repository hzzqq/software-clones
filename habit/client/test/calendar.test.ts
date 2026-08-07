import { describe, it, expect } from 'vitest';
import { buildMonthGrid, daysInMonth, firstWeekday, WEEKDAY_LABELS } from '../src/utils/calendar';

describe('calendar utils', () => {
  it('daysInMonth 支持闰年', () => {
    expect(daysInMonth(2024, 1)).toBe(29); // 2024 闰年 2 月
    expect(daysInMonth(2025, 1)).toBe(28);
    expect(daysInMonth(2025, 0)).toBe(31);
    expect(daysInMonth(2025, 3)).toBe(30);
  });

  it('2025-08 第一天是周五（getDay=5）', () => {
    expect(firstWeekday(2025, 7)).toBe(5);
  });

  it('周日起始：2025-08 首行以周日补位开头', () => {
    const weeks = buildMonthGrid(2025, 7, '2025-08-06', 0);
    const first = weeks[0];
    expect(first).toHaveLength(7);
    // 8/1 是周五 → 前面补 7/27,7/28,7/29,7/30,7/31
    expect(first[0].dayOfMonth).toBe(27);
    expect(first[0].inMonth).toBe(false);
    expect(first[5].dayOfMonth).toBe(1);
    expect(first[5].inMonth).toBe(true);
    expect(first[5].dateKey).toBe('2025-08-01');
  });

  it('周一起始：2025-08 首行以周一补位开头', () => {
    const weeks = buildMonthGrid(2025, 7, '2025-08-06', 1);
    const first = weeks[0];
    expect(first).toHaveLength(7);
    // 8/1 周五 → 前面补 7/28(周一)..7/31
    expect(first[0].dayOfMonth).toBe(28);
    expect(first[0].dateKey).toBe('2025-07-28');
    expect(first[4].dateKey).toBe('2025-08-01');
  });

  it('标记今天', () => {
    const weeks = buildMonthGrid(2025, 7, '2025-08-06', 0);
    const todayCell = weeks.flat().find((c) => c.isToday);
    expect(todayCell?.dateKey).toBe('2025-08-06');
    expect(todayCell?.inMonth).toBe(true);
  });

  it('网格总格数是 7 的倍数且覆盖整月', () => {
    const weeks = buildMonthGrid(2025, 1, '2025-02-10', 1); // 2025-02 28 天
    const cells = weeks.flat();
    expect(cells.length % 7).toBe(0);
    const inMonth = cells.filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(28);
    expect(inMonth[0].dateKey).toBe('2025-02-01');
    expect(inMonth[27].dateKey).toBe('2025-02-28');
  });

  it('周一/周日两种起点都能铺满整周', () => {
    for (const start of [0, 1] as const) {
      const weeks = buildMonthGrid(2025, 7, undefined, start);
      for (const week of weeks) {
        expect(week).toHaveLength(7);
      }
      expect(weeks.length).toBeGreaterThanOrEqual(4);
      expect(weeks.length).toBeLessThanOrEqual(6);
    }
  });

  it('WEEKDAY_LABELS 共 7 个', () => {
    expect(WEEKDAY_LABELS).toHaveLength(7);
  });
});
