import { apiClient } from './client';
import type { Project, Task, TaskInput, TodayItem } from '../types';

export interface TaskListParams {
  completed?: boolean;
}

function toPayload(values: Partial<TaskInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (values.title !== undefined) payload.title = values.title;
  if (values.description !== undefined) payload.description = values.description;
  if (values.priority !== undefined) payload.priority = values.priority;
  if (values.dueDate !== undefined) payload.dueDate = values.dueDate;
  if (values.isCompleted !== undefined) payload.isCompleted = values.isCompleted;
  if (values.parentId !== undefined) payload.parentId = values.parentId;
  if (values.projectId !== undefined) payload.projectId = values.projectId;
  return payload;
}

export const tasksApi = {
  // Projects
  listProjects: (): Promise<Project[]> => apiClient.get<Project[]>('/projects'),
  createProject: (name: string, color: string): Promise<Project> =>
    apiClient.post<Project>('/projects', { name, color }),
  updateProject: (id: number, data: { name?: string; color?: string }): Promise<Project> =>
    apiClient.patch<Project>(`/projects/${id}`, data),
  removeProject: (id: number): Promise<{ id: number }> =>
    apiClient.delete<{ id: number }>(`/projects/${id}`),

  // Tasks
  listTasks: (projectId: number, params: TaskListParams = {}): Promise<Task[]> => {
    const query = new URLSearchParams();
    if (params.completed !== undefined) query.set('completed', String(params.completed));
    const qs = query.toString();
    return apiClient.get<Task[]>(`/projects/${projectId}/tasks${qs ? `?${qs}` : ''}`);
  },
  createTask: (projectId: number, values: TaskInput): Promise<Task> =>
    apiClient.post<Task>(`/projects/${projectId}/tasks`, toPayload(values)),
  updateTask: (id: number, values: Partial<TaskInput>): Promise<Task> =>
    apiClient.patch<Task>(`/tasks/${id}`, toPayload(values)),
  removeTask: (id: number): Promise<{ id: number }> =>
    apiClient.delete<{ id: number }>(`/tasks/${id}`),

  // Today view
  today: (): Promise<TodayItem[]> => apiClient.get<TodayItem[]>('/today'),
};
