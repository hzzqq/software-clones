/** 项目（清单）。 */
export interface Project {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

/** 任务（含可选父任务）。 */
export interface Task {
  id: number;
  projectId: number;
  parentId: number | null;
  title: string;
  description: string;
  priority: number;
  dueDate: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  subTasks?: Task[];
}

/** 今日视图聚合项。 */
export interface TodayItem {
  id: number;
  projectId: number;
  projectName: string;
  projectColor: string;
  title: string;
  priority: number;
  dueDate: string | null;
}

/** 优先级定义。 */
export const PRIORITIES: { value: number; label: string; color: string }[] = [
  { value: 4, label: 'P4', color: '#9e9e9e' },
  { value: 3, label: 'P3', color: '#2196f3' },
  { value: 2, label: 'P2', color: '#ff9800' },
  { value: 1, label: 'P1', color: '#f44336' },
];

/** 项目颜色选项。 */
export const PROJECT_COLORS = [
  'default',
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'purple',
  'pink',
];
