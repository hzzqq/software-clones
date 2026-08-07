/**
 * 月度完成度：当月已打卡天数 / 当月应打卡天数。
 * 当前月“应打卡天数”按今天截止（过去的日子 + 今天），过去 / 未来月份按整月天数。
 */
import { daysInMonth } from './calendar';
import { parseDateKey, toDateKey } from './date';

export interface MonthCompletion {
  completed: number;
  total: number;
  percent: number;
}

/**
 * 计算某月完成度。
 * @param checkedDates 该习惯全部打卡日期
 * @param year 年
 * @param month 月（0-11）
 * @param today 今天的日期键（可选，默认取系统今天）
 */
export function monthCompletion(
  checkedDates: ReadonlySet<string>,
  year: number,
  month: number,
  today?: string
): MonthCompletion {
  const todayStr = today ?? toDateKey(new Date());
  const todayDate = parseDateKey(todayStr);
  const dim = daysInMonth(year, month);

  let total = dim;
  if (year === todayDate.getFullYear() && month === todayDate.getMonth()) {
    total = Math.min(dim, todayDate.getDate());
  }

  let completed = 0;
  for (let day = 1; day <= total; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (checkedDates.has(key)) completed += 1;
  }

  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return { completed, total, percent };
}
