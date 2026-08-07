/**
 * 习惯养成的 XP / 等级模型。
 *
 * - 每次打卡 +10 XP（XP_PER_CHECKIN）；
 * - 等级阈值：到达等级 L 所需累计 XP = 50 × (L-1) × L（L1=0, L2=100, L3=300, L4=600, L5=1000 …）；
 * - levelFromXp 为上述二次式（50·L·(L−1) ≤ xp）的闭式解。
 */

export const XP_PER_CHECKIN = 10;

/** 打卡 n 次累计的 XP。 */
export function totalXp(checkinCount: number): number {
  return checkinCount * XP_PER_CHECKIN;
}

/** 到达等级 level 所需的累计 XP（level 从 1 开始）。 */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 50 * (l - 1) * l;
}

/** 由累计 XP 反推当前等级。 */
export function levelFromXp(xp: number): number {
  const x = Math.max(0, xp);
  return Math.floor((1 + Math.sqrt(1 + (4 * x) / 50)) / 2);
}

export interface LevelProgress {
  level: number;
  /** 当前等级起始累计 XP。 */
  current: number;
  /** 下一等级所需累计 XP。 */
  needed: number;
  /** 距离下一级的进度百分比 0–100。 */
  percent: number;
}

/** 计算等级与升级进度。 */
export function progressToNextLevel(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const current = xpForLevel(level);
  const needed = xpForLevel(level + 1);
  const span = needed - current;
  const percent = span > 0 ? Math.min(100, Math.floor(((xp - current) / span) * 100)) : 0;
  return { level, current, needed, percent };
}
