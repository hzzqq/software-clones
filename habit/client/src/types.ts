/**
 * Habit 的数据模型与常量。
 */

export type FrequencyType = 'daily' | 'weekly';

export interface Habit {
  id: number;
  name: string;
  icon: string;
  frequencyType: FrequencyType;
  /** daily：每天目标次数（默认 1）；weekly：每周目标次数。 */
  targetCount: number;
  createdAt: string;
  updatedAt: string;
  /** 全部打卡日期（YYYY-MM-DD，升序去重）。 */
  checkins: string[];
  totalCheckins: number;
}

export interface HabitInput {
  name: string;
  icon: string;
  frequencyType: FrequencyType;
  targetCount: number;
}

export interface Checkin {
  id: number;
  habitId: number;
  date: string;
  createdAt: string;
}

export const FREQUENCY_OPTIONS: { value: FrequencyType; label: string }[] = [
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
];

export const DEFAULT_ICON = '✅';

/** 预置 emoji 图标池。 */
export const ICON_CHOICES: string[] = [
  '✅',
  '💧',
  '📚',
  '🏃',
  '🧘',
  '🥗',
  '💪',
  '😴',
  '✍️',
  '🎸',
  '🧠',
  '🌅',
  '🚴',
  '🦷',
  '💊',
  '🙏',
];

export function emptyHabitInput(): HabitInput {
  return {
    name: '',
    icon: DEFAULT_ICON,
    frequencyType: 'daily',
    targetCount: 1,
  };
}
