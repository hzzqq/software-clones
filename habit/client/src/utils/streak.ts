/**
 * 连续打卡（streak）计算。
 *
 * 规则：
 * - 日习惯：按“天”粒度统计。以参考日（今天）为终点向前数连续有打卡的天数；
 *   若今天还没打卡，则从昨天开始数（连续天数不因“今天尚未打卡”而清零）。
 * - 周习惯：按 ISO 周粒度统计，一周内打卡次数达到 targetCount 视为“该周完成”。
 */
import { addDays, isoWeekKey, shiftWeekKey } from './date';

/**
 * 日习惯的当前连续天数。
 * @param checkedDates 有打卡的日期集合
 * @param referenceDate 参考日（通常为今天）
 */
export function computeDailyStreak(checkedDates: ReadonlySet<string>, referenceDate: string): number {
  let cursor = referenceDate;
  if (!checkedDates.has(cursor)) {
    cursor = addDays(cursor, -1);
  }
  let streak = 0;
  while (checkedDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** 日习惯的历史最长连续天数（无需参考日）。 */
export function longestDailyStreak(checkedDates: ReadonlySet<string>): number {
  const dates = Array.from(checkedDates).sort();
  let longest = 0;
  let current = 0;
  let prev: string | null = null;
  for (const d of dates) {
    if (prev !== null && addDays(prev, 1) === d) {
      current += 1;
    } else {
      current = 1;
    }
    if (current > longest) longest = current;
    prev = d;
  }
  return longest;
}

/**
 * 把日期集合按 ISO 周聚合为“完成周”集合。
 * @param checkedDates 有打卡的日期集合
 * @param targetCount 每周目标次数
 */
export function completedWeeks(checkedDates: ReadonlySet<string>, targetCount: number): Set<string> {
  const countByWeek = new Map<string, number>();
  for (const date of checkedDates) {
    const week = isoWeekKey(date);
    countByWeek.set(week, (countByWeek.get(week) ?? 0) + 1);
  }
  const result = new Set<string>();
  for (const [week, count] of countByWeek.entries()) {
    if (count >= targetCount) result.add(week);
  }
  return result;
}

/**
 * 周习惯的当前连续周数。
 * @param completedWeeksSet 已达标（达到 targetCount）的周集合
 * @param referenceWeek 参考周键（YYYY-Www，通常为今天所在周）
 */
export function computeWeeklyStreak(
  completedWeeksSet: ReadonlySet<string>,
  referenceWeek: string
): number {
  let cursor = referenceWeek;
  if (!completedWeeksSet.has(cursor)) {
    cursor = shiftWeekKey(cursor, -1);
  }
  let streak = 0;
  while (completedWeeksSet.has(cursor)) {
    streak += 1;
    cursor = shiftWeekKey(cursor, -1);
  }
  return streak;
}
