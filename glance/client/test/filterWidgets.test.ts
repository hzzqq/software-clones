import { describe, it, expect } from 'vitest';
import type { Widget, WidgetType } from '../src/types';
import { groupWidgetsByType } from '../src/utils/filterWidgets';

/** 构造测试用组件（config 取 NotesConfig 形态，满足 WidgetConfig 联合类型）。 */
function makeWidget(id: number, type: WidgetType): Widget {
  return {
    id,
    type,
    title: `widget-${id}`,
    layout: { x: 0, y: 0, w: 1, h: 1 },
    config: { text: '' },
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('groupWidgetsByType', () => {
  it('按类型分组，且各组内部保持原顺序', () => {
    const widgets: Widget[] = [
      makeWidget(1, 'rss'),
      makeWidget(2, 'clock'),
      makeWidget(3, 'rss'),
      makeWidget(4, 'weather'),
      makeWidget(5, 'clock'),
    ];
    const groups = groupWidgetsByType(widgets);
    expect(Object.keys(groups).sort()).toEqual(['clock', 'rss', 'weather']);
    expect(groups['rss'].map((w) => w.id)).toEqual([1, 3]);
    expect(groups['clock'].map((w) => w.id)).toEqual([2, 5]);
    expect(groups['weather'].map((w) => w.id)).toEqual([4]);
  });

  it('空输入返回空对象 {}', () => {
    expect(groupWidgetsByType([])).toEqual({});
  });

  it('不修改入参数组（保持长度、顺序与元素引用）', () => {
    const widgets: Widget[] = [makeWidget(1, 'rss'), makeWidget(2, 'rss'), makeWidget(3, 'notes')];
    const snapshot = widgets.map((w) => ({ ...w }));
    const groups = groupWidgetsByType(widgets);
    // 入参数组本身未被改动
    expect(widgets).toEqual(snapshot);
    expect(widgets.map((w) => w.id)).toEqual([1, 2, 3]);
    // 对返回的分组数组做删改，不应反向影响入参
    groups['rss']?.pop();
    expect(widgets.length).toBe(3);
  });
});
