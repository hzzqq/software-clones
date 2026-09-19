/** 番茄任务。 */
export interface Task {
  id: number;
  title: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  isDone: boolean;
  createdAt: string;
}

/** 会话（只追加日志）。 */
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

/** 创建 / 更新任务的输入。 */
export interface TaskInput {
  title?: string;
  estimatedPomodoros?: number;
  completedPomodoros?: number;
  isDone?: boolean;
}

/** 创建会话的输入。 */
export interface SessionInput {
  taskId?: number | null;
  kind: 'focus' | 'short_break' | 'long_break';
  startedAt?: string;
  endedAt?: string | null;
  durationSec: number;
  completed?: boolean;
}
