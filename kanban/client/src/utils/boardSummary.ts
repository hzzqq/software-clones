import { BoardDetail, PRIORITY_LABELS } from '../types';
import { formatDueLabel } from './filterCards';

export interface BoardSummaryOptions {
  /** 是否在每张卡片前用 ✓ / • 标注完成状态。默认 true。 */
  showCompleted?: boolean;
  /** 参考时间，传给 formatDueLabel 计算截止日标签（测试用）。缺省为当前时间。 */
  now?: Date;
}

/**
 * 将看板聚合为一段纯文本摘要，便于复制到聊天 / 邮件 / 文档中分享。
 *
 * 纯函数：不修改入参、不依赖 React、不触碰 DOM；截止日标签与色调
 * 复用 formatDueLabel（避免重复实现日期语义）。第二个参数 now 用于测试断言确定性。
 *
 * 结构示例：
 *   看板：项目计划
 *   进度：1/3 完成（33%）
 *
 *   【待办】(2 张)
 *     • 设计稿（紧急，今天）
 *     • 联调（中）
 *
 *   【完成】(1 张)
 *     ✓ 需求
 */
export function formatBoardSummary(
  detail: BoardDetail,
  options: BoardSummaryOptions = {}
): string {
  const { showCompleted = true, now } = options;

  const total = detail.cards.length;
  const done = detail.cards.filter((c) => c.completed === 1).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const lines: string[] = [];
  lines.push(`看板：${detail.name}`);
  lines.push(`进度：${done}/${total} 完成（${pct}%）`);
  lines.push('');

  const lists = [...detail.lists].sort((a, b) => a.position - b.position);
  for (const list of lists) {
    const cards = detail.cards
      .filter((c) => c.listId === list.id)
      .sort((a, b) => a.position - b.position);

    lines.push(`【${list.title}】(${cards.length} 张)`);
    if (cards.length === 0) {
      lines.push('  （空）');
    }

    for (const c of cards) {
      const meta: string[] = [];
      if (c.priority > 0) {
        meta.push(PRIORITY_LABELS[c.priority] ?? `P${c.priority}`);
      }
      if (c.dueDate) {
        meta.push(formatDueLabel(c.dueDate, now).text);
      }
      const metaStr = meta.length ? `（${meta.join('，')}）` : '';
      const mark = showCompleted ? (c.completed === 1 ? '✓ ' : '• ') : '';
      lines.push(`  ${mark}${c.title}${metaStr}`);
    }
    lines.push('');
  }

  // 去掉末尾多余的空行，仅保留一个结尾换行。
  return lines.join('\n').replace(/\n+$/, '\n');
}
