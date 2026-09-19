/** 番茄任务。 */
export interface Task {
  id: number;
  title: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  isDone: boolean;
  createdAt: string;
}

/** 会话日志。 */
export interface Session {
  id: number;
  taskId: number | null;
  kind: 'focus' | 'short_break' | 'long_break';
  startedAt: string;
  endedAt: string | null;
  durationSec: number;
  completed: boolean;
}

/** 统计汇总。 */
export interface Stats {
  todayCompleted: number;
  todayFocusSec: number;
  totalCompleted: number;
  totalFocusSec: number;
}

/** 计时阶段。 */
export type Phase = 'focus' | 'short_break' | 'long_break';

/** 各阶段默认时长（秒）。 */
export const PHASE_DURATIONS: Record<Phase, number> = {
  focus: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

export const PHASE_LABELS: Record<Phase, string> = {
  focus: '专注',
  short_break: '短休息',
  long_break: '长休息',
};

/** 每完成多少个专注番茄后进入长休息。 */
export const LONG_BREAK_INTERVAL = 4;
