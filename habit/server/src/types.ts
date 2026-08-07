/**
 * Habit 服务端类型。
 */

export type FrequencyType = 'daily' | 'weekly';

/** 习惯（对外形态：checkins 为全部打卡日期，升序去重）。 */
export interface Habit {
  id: number;
  name: string;
  icon: string;
  frequencyType: FrequencyType;
  targetCount: number;
  createdAt: string;
  updatedAt: string;
  checkins: string[];
  totalCheckins: number;
}

/** 新建 / 更新习惯的输入。 */
export interface HabitInput {
  name: string;
  icon: string;
  frequencyType: FrequencyType;
  targetCount: number;
}

/** 打卡记录。 */
export interface Checkin {
  id: number;
  habitId: number;
  date: string;
  createdAt: string;
}

/** 数据库行（snake_case）。 */
export interface HabitRow {
  id: number;
  name: string;
  icon: string;
  frequency_type: string;
  target_count: number;
  created_at: string;
  updated_at: string;
}

export interface CheckinRow {
  id: number;
  habit_id: number;
  date: string;
  created_at: string;
}
