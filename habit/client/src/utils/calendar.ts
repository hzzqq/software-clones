/**
 * 月历网格生成：用于打卡日历视图。
 * 网格按周排列（可配置周一 / 周日开头），包含上月 / 下月的补位格。
 */
import { toDateKey } from './date';

export interface CalendarCell {
  dateKey: string;
  dayOfMonth: number;
  /** 是否属于当前展示月（补位格为 false）。 */
  inMonth: boolean;
  isToday: boolean;
}

export const WEEKDAY_LABELS: string[] = ['日', '一', '二', '三', '四', '五', '六'];

/** 某年某月（0-11）的天数。 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 某年某月 1 号是星期几（0=周日）。 */
export function firstWeekday(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/**
 * 生成某月的日历网格（按周分行）。
 * @param year 年
 * @param month 月（0-11）
 * @param today 今天的日期键（可选，用于高亮）
 * @param weekStartsOn 每周从哪天开始：0=周日，1=周一
 */
export function buildMonthGrid(
  year: number,
  month: number,
  today?: string,
  weekStartsOn: 0 | 1 = 0
): CalendarCell[][] {
  const leading = (firstWeekday(year, month) - weekStartsOn + 7) % 7;
  const dim = daysInMonth(year, month);
  const prevDim = daysInMonth(year, month - 1);

  const cells: CalendarCell[] = [];

  // 上月补位
  for (let i = 0; i < leading; i += 1) {
    const day = prevDim - leading + i + 1;
    const d = new Date(year, month - 1, day);
    cells.push({ dateKey: toDateKey(d), dayOfMonth: day, inMonth: false, isToday: false });
  }

  // 本月
  for (let day = 1; day <= dim; day += 1) {
    const d = new Date(year, month, day);
    const dateKey = toDateKey(d);
    cells.push({ dateKey, dayOfMonth: day, inMonth: true, isToday: dateKey === today });
  }

  // 下月补位，补齐到整周
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i += 1) {
      const d = new Date(year, month + 1, i + 1);
      cells.push({ dateKey: toDateKey(d), dayOfMonth: i + 1, inMonth: false, isToday: false });
    }
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** 月份标题，如 2025 年 8 月。 */
export function monthLabel(year: number, month: number): string {
  return `${year} 年 ${month + 1} 月`;
}
