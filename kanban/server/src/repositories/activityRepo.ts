import { db } from '../db';

/**
 * 活动类型。系统自动事件与用户评论共用一条时间线：
 * - created   卡片创建
 * - moved     跨列移动
 * - renamed   标题修改
 * - due       截止日变更
 * - priority  优先级变更
 * - assignee  指派人变更
 * - completed 完成状态变更
 * - batch     列批量操作波及到该卡片
 * - comment   用户评论（唯一允许删除的类型）
 */
export const ACTIVITY_KINDS = [
  'created',
  'moved',
  'renamed',
  'due',
  'priority',
  'assignee',
  'completed',
  'batch',
  'comment',
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** 判断任意值是否为受支持的活动类型（供路由入参校验复用）。 */
export function isActivityKind(value: unknown): value is ActivityKind {
  return typeof value === 'string' && (ACTIVITY_KINDS as readonly string[]).includes(value);
}

export interface Activity {
  id: number;
  cardId: number;
  kind: ActivityKind;
  detail: string;
  author: string;
  createdAt: string;
}

export interface ActivityRow {
  id: number;
  card_id: number;
  kind: string;
  detail: string;
  author: string;
  created_at: string;
}

export function rowToActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    cardId: row.card_id,
    // 兜底：历史库中若存在未知 kind，统一降级为 'batch'，避免前端映射到 undefined 文案。
    kind: isActivityKind(row.kind) ? row.kind : 'batch',
    detail: row.detail ?? '',
    author: row.author ?? '',
    createdAt: row.created_at,
  };
}

export interface ActivityInput {
  cardId: number;
  kind: ActivityKind;
  detail?: string;
  author?: string;
}

/** Data-access layer for the per-card activity timeline (events + comments). */
export const activityRepo = {
  /** 某张卡片的时间线，按时间倒序（最新在前）。 */
  listByCard(cardId: number, limit = 200): Activity[] {
    const safeLimit: number =
      Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 500) : 200;
    const rows = db
      .prepare(
        'SELECT * FROM card_activity WHERE card_id = ? ORDER BY created_at DESC, id DESC LIMIT ?'
      )
      .all(cardId, safeLimit) as ActivityRow[];
    return rows.map(rowToActivity);
  },

  getById(id: number): Activity | undefined {
    const row = db.prepare('SELECT * FROM card_activity WHERE id = ?').get(id) as
      | ActivityRow
      | undefined;
    return row ? rowToActivity(row) : undefined;
  },

  create(input: ActivityInput): Activity {
    const now: string = new Date().toISOString();
    const info = db
      .prepare(
        'INSERT INTO card_activity (card_id, kind, detail, author, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(input.cardId, input.kind, input.detail ?? '', (input.author ?? '').trim(), now);
    return this.getById(Number(info.lastInsertRowid))!;
  },

  /**
   * 记录一条系统事件。与 create 的区别只在语义与容错：
   * 写日志失败不应该让主业务（改卡片）跟着失败，因此这里吞掉异常并返回 null。
   */
  log(cardId: number, kind: ActivityKind, detail: string): Activity | null {
    try {
      return this.create({ cardId, kind, detail });
    } catch {
      return null;
    }
  },

  remove(id: number): void {
    db.prepare('DELETE FROM card_activity WHERE id = ?').run(id);
  },

  /** 统计单张卡片的评论数（不含系统事件）。 */
  countComments(cardId: number): number {
    const row = db
      .prepare("SELECT COUNT(*) AS n FROM card_activity WHERE card_id = ? AND kind = 'comment'")
      .get(cardId) as { n: number } | undefined;
    return row?.n ?? 0;
  },

  /**
   * 批量统计多张卡片的评论数，返回 cardId → count 映射。
   * 看板聚合视图用它避免 N+1 查询；入参为空数组时直接返回空映射。
   */
  countCommentsByCards(cardIds: number[]): Record<number, number> {
    const map: Record<number, number> = {};
    if (!Array.isArray(cardIds) || cardIds.length === 0) return map;
    const placeholders: string = cardIds.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT card_id, COUNT(*) AS n FROM card_activity
          WHERE kind = 'comment' AND card_id IN (${placeholders})
          GROUP BY card_id`
      )
      .all(...cardIds) as Array<{ card_id: number; n: number }>;
    for (const row of rows) map[row.card_id] = row.n;
    return map;
  },
};

export default activityRepo;
