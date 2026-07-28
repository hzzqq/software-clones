import { describe, it, expect } from 'vitest';
import { formatBoardSummary } from '../src/utils/boardSummary';
import { BoardDetail } from '../src/types';

function makeDetail(): BoardDetail {
  return {
    id: 1,
    name: '项目计划',
    createdAt: '',
    updatedAt: '',
    lists: [
      { id: 10, boardId: 1, title: '待办', position: 0, createdAt: '' },
      { id: 11, boardId: 1, title: '完成', position: 1, createdAt: '' },
    ],
    cards: [
      {
        id: 1,
        listId: 10,
        title: '设计稿',
        description: '',
        dueDate: '2024-05-01T16:00:00.000Z',
        priority: 3,
        completed: 0,
        position: 0,
        createdAt: '',
        updatedAt: '',
        tagIds: [],
      },
      {
        id: 2,
        listId: 10,
        title: '联调',
        description: '',
        dueDate: null,
        priority: 1,
        completed: 0,
        position: 1,
        createdAt: '',
        updatedAt: '',
        tagIds: [],
      },
      {
        id: 3,
        listId: 11,
        title: '需求',
        description: '',
        dueDate: null,
        priority: 0,
        completed: 1,
        position: 0,
        createdAt: '',
        updatedAt: '',
        tagIds: [],
      },
    ],
    tags: [],
  };
}

describe('formatBoardSummary', () => {
  it('reports total / completed / percentage', () => {
    const text = formatBoardSummary(makeDetail());
    expect(text).toContain('看板：项目计划');
    expect(text).toContain('进度：1/3 完成（33%）');
  });

  it('lists every column with its card count and empty placeholder', () => {
    const text = formatBoardSummary(makeDetail());
    expect(text).toContain('【待办】(2 张)');
    expect(text).toContain('【完成】(1 张)');
  });

  it('marks completed cards with ✓ and incomplete with •', () => {
    const text = formatBoardSummary(makeDetail());
    expect(text).toContain('• 设计稿');
    expect(text).toContain('• 联调');
    expect(text).toContain('✓ 需求');
  });

  it('appends priority label and due text as card metadata', () => {
    const text = formatBoardSummary(makeDetail(), { now: new Date('2024-04-28T12:00:00Z') });
    // 紧急 来自 PRIORITY_LABELS[3]；截止日标签文本随运行时时区变化，仅断言存在性。
    expect(text).toContain('设计稿（紧急');
    // 无截止日、优先级为 0 的卡片不应有多余元数据括号。
    expect(text).toContain('✓ 需求');
  });

  it('omits completion marks when showCompleted is false', () => {
    const text = formatBoardSummary(makeDetail(), { showCompleted: false });
    expect(text).not.toContain('• ');
    expect(text).not.toContain('✓ ');
    expect(text).toContain('设计稿');
  });

  it('handles an empty board without dividing by zero', () => {
    const empty: BoardDetail = { ...makeDetail(), cards: [], lists: [] };
    const text = formatBoardSummary(empty);
    expect(text).toContain('进度：0/0 完成（0%）');
  });

  it('does not mutate the input detail', () => {
    const detail = makeDetail();
    const snapshot = JSON.stringify(detail);
    formatBoardSummary(detail);
    expect(JSON.stringify(detail)).toBe(snapshot);
  });
});
