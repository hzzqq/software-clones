import { apiClient } from './client';
import { Activity } from '../types';

/** 新建评论的入参；author 省略时服务端存空串（表示匿名）。 */
export interface CommentInput {
  text: string;
  author?: string;
}

export const activityApi = {
  /**
   * 拉取某张卡片的活动时间线（服务端按时间倒序返回）。
   * `limit` 缺省 200，服务端硬上限 500。
   */
  listByCard: (cardId: number, limit?: number): Promise<Activity[]> =>
    apiClient.get<Activity[]>(
      limit && limit > 0
        ? `/cards/${cardId}/activity?limit=${Math.floor(limit)}`
        : `/cards/${cardId}/activity`
    ),
  addComment: (cardId: number, input: CommentInput): Promise<Activity> =>
    apiClient.post<Activity>(`/cards/${cardId}/comments`, input),
  /** 仅评论可删；对系统事件调用会被服务端拒绝（400）。 */
  removeComment: (activityId: number): Promise<null> =>
    apiClient.delete<null>(`/activity/${activityId}`),
};
