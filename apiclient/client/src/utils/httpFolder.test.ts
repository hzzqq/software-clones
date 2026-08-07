import { describe, it, expect } from 'vitest';
import { groupByFolder, folderNamesOf, UNGROUPED_FOLDER } from './http';

interface Item {
  id: number;
  folder?: string;
}

describe('groupByFolder', () => {
  it('按文件夹归类', () => {
    const out = groupByFolder<Item>([
      { id: 1, folder: 'auth' },
      { id: 2, folder: 'user' },
      { id: 3, folder: 'auth' },
    ]);
    expect(Object.keys(out)).toEqual(['auth', 'user']);
    expect(out.auth.map((i) => i.id)).toEqual([1, 3]);
  });

  it('空 / 空白 folder 归入未分组', () => {
    const out = groupByFolder<Item>([{ id: 1, folder: '  ' }, { id: 2 }]);
    expect(out[UNGROUPED_FOLDER].map((i) => i.id)).toEqual([1, 2]);
  });

  it('未分组固定排在最后', () => {
    const out = groupByFolder<Item>([{ id: 1 }, { id: 2, folder: 'zz' }, { id: 3, folder: 'aa' }]);
    expect(Object.keys(out)).toEqual(['aa', 'zz', UNGROUPED_FOLDER]);
  });

  it('组内保持原始插入顺序', () => {
    const out = groupByFolder<Item>([
      { id: 3, folder: 'a' },
      { id: 1, folder: 'a' },
    ]);
    expect(out.a.map((i) => i.id)).toEqual([3, 1]);
  });

  it('空数组返回空对象', () => {
    expect(groupByFolder<Item>([])).toEqual({});
  });

  it('不修改入参数组', () => {
    const items: Item[] = [{ id: 1, folder: 'b' }, { id: 2, folder: 'a' }];
    groupByFolder(items);
    expect(items.map((i) => i.id)).toEqual([1, 2]);
  });
});

describe('folderNamesOf', () => {
  it('去重并升序返回', () => {
    expect(
      folderNamesOf<Item>([{ id: 1, folder: 'b' }, { id: 2, folder: 'a' }, { id: 3, folder: 'b' }]),
    ).toEqual(['a', 'b']);
  });

  it('忽略空与空白', () => {
    expect(folderNamesOf<Item>([{ id: 1, folder: '   ' }, { id: 2 }])).toEqual([]);
  });

  it('空数组返回空数组', () => {
    expect(folderNamesOf<Item>([])).toEqual([]);
  });
});
