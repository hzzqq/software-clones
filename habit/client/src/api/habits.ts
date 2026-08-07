import { apiClient } from './client';
import type { Checkin, Habit, HabitInput } from '../types';

/**
 * 习惯养成 API。
 */
export const habitsApi = {
  list(): Promise<Habit[]> {
    return apiClient.get<Habit[]>('/habits');
  },

  get(id: number): Promise<Habit> {
    return apiClient.get<Habit>(`/habits/${id}`);
  },

  create(input: HabitInput): Promise<Habit> {
    return apiClient.post<Habit>('/habits', input);
  },

  update(id: number, input: Partial<HabitInput>): Promise<Habit> {
    return apiClient.patch<Habit>(`/habits/${id}`, input);
  },

  remove(id: number): Promise<null> {
    return apiClient.delete<null>(`/habits/${id}`);
  },

  /** 打卡（同一天重复打卡会返回 code 40900）。 */
  checkIn(habitId: number, date: string): Promise<Checkin> {
    return apiClient.post<Checkin>(`/habits/${habitId}/checkins`, { date });
  },

  /** 取消某天打卡。 */
  cancelCheckIn(habitId: number, date: string): Promise<null> {
    return apiClient.delete<null>(`/habits/${habitId}/checkins/${date}`);
  },
};
