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

/** 任务（列表响应时附带一级子任务）。 */
export interface TaskWithSubs extends Task {
  subTasks: Task[];
}

/** 创建 / 更新任务的输入。 */
export interface TaskInput {
  projectId?: number;
  parentId?: number | null;
  title?: string;
  description?: string;
  priority?: number;
  dueDate?: string | null;
  isCompleted?: boolean;
  sortOrder?: number;
}

/** 创建 / 更新项目的输入。 */
export interface ProjectInput {
  name?: string;
  color?: string;
  sortOrder?: number;
}
