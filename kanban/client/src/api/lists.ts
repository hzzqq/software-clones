import { apiClient } from './client';
import { List } from '../types';

export interface ListInput {
  boardId: number;
  title: string;
  position: number;
  /** 在制品（WIP）上限，0 或省略表示不限制。 */
  wipLimit?: number;
}

/** 列表补丁：三个字段都可选，服务端按提供的字段增量更新。 */
export interface ListPatch {
  title?: string;
  position?: number;
  wipLimit?: number;
}

/** 列批量操作类型，取值与服务端 `BATCH_ACTIONS` 一一对应。 */
export type BatchAction =
  | 'clear-completed'
  | 'complete-all'
  | 'reopen-all'
  | 'move-all'
  | 'move-completed';

/** 批量操作的入参；move-* 两种操作必须提供 targetListId。 */
export interface BatchInput {
  action: BatchAction;
  targetListId?: number;
}

/** 批量操作结果：受影响卡片数与其 id 列表，供前端做局部 state 同步。 */
export interface BatchResult {
  action: BatchAction;
  affected: number;
  cardIds: number[];
}

export const listsApi = {
  create: (input: ListInput): Promise<List> =>
    apiClient.post<List>('/lists', input),
  update: (id: number, patch: ListPatch): Promise<List> =>
    apiClient.patch<List>(`/lists/${id}`, patch),
  remove: (id: number): Promise<null> =>
    apiClient.delete<null>(`/lists/${id}`),
  batch: (id: number, input: BatchInput): Promise<BatchResult> =>
    apiClient.post<BatchResult>(`/lists/${id}/batch`, input),
};
