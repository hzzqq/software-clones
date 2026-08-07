import dayjs from 'dayjs';
import { Activity, ActivityKind } from '../types';

/** 评论正文长度上限，与服务端 `MAX_COMMENT_LENGTH` 保持一致。 */
export const MAX_COMMENT_LENGTH = 2000;

/** 活动类型 → 时间线上的中文前缀文案。 */
export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  created: '创建卡片',
  moved: '移动卡片',
  renamed: '修改标题',
  due: '调整截止日',
  priority: '调整优先级',
  assignee: '变更指派人',
  completed: '变更完成状态',
  batch: '批量操作',
  comment: '评论',
};

/** 活动类型 → 语义色，供时间线上的圆点/徽标着色。 */
export const ACTIVITY_COLORS: Record<ActivityKind, string> = {
  created: 'success.main',
  moved: 'info.main',
  renamed: 'text.secondary',
  due: 'warning.main',
  priority: 'warning.main',
  assignee: 'primary.main',
  completed: 'success.main',
  batch: 'secondary.main',
  comment: 'primary.main',
};

/** 判断一条活动是否为用户评论（只有评论允许删除）。 */
export function isComment(activity: Activity): boolean {
  return activity.kind === 'comment';
}

/** 取活动类型文案；未知类型兜底为「操作」，避免渲染出 undefined。 */
export function activityKindLabel(kind: ActivityKind | string): string {
  return ACTIVITY_LABELS[kind as ActivityKind] ?? '操作';
}

/**
 * 时间线上单条记录的展示文案。
 * - 评论：直接展示正文（正文本身就是用户输入）。
 * - 系统事件：展示服务端写入的 detail；detail 为空时退化为类型文案，
 *   保证任何一条记录都有可读内容。
 */
export function formatActivityText(activity: Activity): string {
  const detail: string = (activity.detail ?? '').trim();
  if (isComment(activity)) return detail;
  return detail || activityKindLabel(activity.kind);
}

/** 评论作者显示名；空串统一显示为「匿名」。 */
export function formatAuthor(author: string | null | undefined): string {
  const name: string = (author ?? '').trim();
  return name || '匿名';
}

export interface ActivityValidation {
  ok: boolean;
  /** 去除首尾空白后的正文；校验失败时为空串。 */
  value: string;
  /** 校验失败原因；成功时为空串。 */
  error: string;
}

/**
 * 校验评论草稿。与服务端同规则做前置拦截，避免明知会 400 还发一次请求。
 */
export function validateComment(text: string | null | undefined): ActivityValidation {
  const value: string = (text ?? '').trim();
  if (!value) return { ok: false, value: '', error: '评论内容不能为空' };
  if (value.length > MAX_COMMENT_LENGTH) {
    return {
      ok: false,
      value: '',
      error: `评论不能超过 ${MAX_COMMENT_LENGTH} 字（当前 ${value.length} 字）`,
    };
  }
  return { ok: true, value, error: '' };
}

/** 按时间倒序排列（新的在前）；时间相同时用 id 兜底保证稳定。 */
export function sortActivitiesDesc(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => {
    const ta: number = dayjs(a.createdAt).valueOf();
    const tb: number = dayjs(b.createdAt).valueOf();
    const va: number = Number.isFinite(ta) ? ta : 0;
    const vb: number = Number.isFinite(tb) ? tb : 0;
    if (va !== vb) return vb - va;
    return b.id - a.id;
  });
}

export interface ActivityGroup {
  /** 分组日期键，格式 YYYY-MM-DD；时间非法时归入 'unknown'。 */
  day: string;
  /** 分组标题，如「今天」「昨天」「2026-01-03」。 */
  label: string;
  items: Activity[];
}

/**
 * 按自然日分组，用于时间线的日期分隔条。
 * 组内、组间都保持倒序（最新的一天与最新的一条在最前）。
 */
export function groupActivitiesByDay(
  activities: Activity[],
  now: number = Date.now()
): ActivityGroup[] {
  const sorted: Activity[] = sortActivitiesDesc(activities);
  const today: string = dayjs(now).format('YYYY-MM-DD');
  const yesterday: string = dayjs(now).subtract(1, 'day').format('YYYY-MM-DD');
  const groups: ActivityGroup[] = [];
  const index: Record<string, ActivityGroup> = {};

  for (const item of sorted) {
    const t = dayjs(item.createdAt);
    const day: string = t.isValid() ? t.format('YYYY-MM-DD') : 'unknown';
    let group: ActivityGroup | undefined = index[day];
    if (!group) {
      let label: string = day;
      if (day === 'unknown') label = '时间未知';
      else if (day === today) label = '今天';
      else if (day === yesterday) label = '昨天';
      group = { day, label, items: [] };
      index[day] = group;
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

export interface ActivitySummary {
  total: number;
  comments: number;
  /** 系统自动记录的事件数（total - comments）。 */
  events: number;
}

/** 统计时间线构成，用于 Tab 上的计数徽标。 */
export function summarizeActivity(activities: Activity[]): ActivitySummary {
  let comments = 0;
  for (const a of activities) {
    if (isComment(a)) comments += 1;
  }
  return { total: activities.length, comments, events: activities.length - comments };
}
