import { describe, it, expect } from 'vitest';
import {
  jsonTypeOf,
  previewOf,
  joinPath,
  flattenJson,
  filterFlatRows,
  summarizeJson,
  countOccurrences,
  filterLines,
  headerRows,
} from './response';

describe('jsonTypeOf', () => {
  it('识别各类 JSON 值', () => {
    expect(jsonTypeOf(null)).toBe('null');
    expect(jsonTypeOf([])).toBe('array');
    expect(jsonTypeOf({})).toBe('object');
    expect(jsonTypeOf(1)).toBe('number');
    expect(jsonTypeOf(true)).toBe('boolean');
    expect(jsonTypeOf('s')).toBe('string');
  });
});

describe('previewOf', () => {
  it('数组显示元素个数', () => {
    expect(previewOf([1, 2, 3])).toBe('[ 3 项 ]');
  });

  it('对象显示键个数', () => {
    expect(previewOf({ a: 1, b: 2 })).toBe('{ 2 个键 }');
  });

  it('null 显示 null', () => {
    expect(previewOf(null)).toBe('null');
  });

  it('标量原样显示', () => {
    expect(previewOf(42)).toBe('42');
    expect(previewOf(false)).toBe('false');
  });

  it('超长字符串被截断并加省略号', () => {
    const out = previewOf('x'.repeat(120), 10);
    expect(out).toBe(`${'x'.repeat(10)}…`);
  });
});

describe('joinPath', () => {
  it('数组下标使用方括号', () => {
    expect(joinPath('$', 0)).toBe('$[0]');
  });

  it('合法标识符使用点号', () => {
    expect(joinPath('$', 'name')).toBe('$.name');
  });

  it('非法标识符使用引号下标', () => {
    expect(joinPath('$', 'a-b')).toBe('$["a-b"]');
  });

  it('键名内的引号被转义', () => {
    expect(joinPath('$', 'a"b')).toBe('$["a\\"b"]');
  });

  it('父路径为空时直接返回键名', () => {
    expect(joinPath('', 'root')).toBe('root');
  });
});

describe('flattenJson', () => {
  it('拍平嵌套对象并生成路径', () => {
    const rows = flattenJson('{"a":{"b":1}}')!;
    expect(rows.map((r) => r.path)).toEqual(['$', '$.a', '$.a.b']);
  });

  it('数组元素带下标路径', () => {
    const rows = flattenJson('[10,20]')!;
    expect(rows.map((r) => r.path)).toEqual(['$', '$[0]', '$[1]']);
  });

  it('记录层级深度', () => {
    const rows = flattenJson('{"a":{"b":1}}')!;
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2]);
  });

  it('保持对象键的原始顺序', () => {
    const rows = flattenJson('{"z":1,"a":2}')!;
    expect(rows.map((r) => r.path)).toEqual(['$', '$.z', '$.a']);
  });

  it('非法 JSON 返回 null', () => {
    expect(flattenJson('not json')).toBeNull();
  });

  it('空文本返回 null', () => {
    expect(flattenJson('')).toBeNull();
  });

  it('超过 limit 后停止展开', () => {
    const rows = flattenJson('[1,2,3,4,5]', 3)!;
    expect(rows.length).toBe(3);
  });

  it('标量根节点也能处理', () => {
    const rows = flattenJson('123')!;
    expect(rows).toEqual([{ path: '$', type: 'number', preview: '123', depth: 0 }]);
  });

  it('null 值节点类型为 null', () => {
    const rows = flattenJson('{"a":null}')!;
    expect(rows[1].type).toBe('null');
  });
});

describe('filterFlatRows', () => {
  const rows = flattenJson('{"user":{"name":"tom","age":3}}')!;

  it('按路径过滤', () => {
    expect(filterFlatRows(rows, 'name').map((r) => r.path)).toEqual(['$.user.name']);
  });

  it('按值预览过滤', () => {
    expect(filterFlatRows(rows, 'tom').map((r) => r.path)).toEqual(['$.user.name']);
  });

  it('大小写不敏感', () => {
    expect(filterFlatRows(rows, 'TOM').length).toBe(1);
  });

  it('空关键字返回全部', () => {
    expect(filterFlatRows(rows, '  ').length).toBe(rows.length);
  });

  it('无匹配返回空数组', () => {
    expect(filterFlatRows(rows, 'zzz')).toEqual([]);
  });
});

describe('summarizeJson', () => {
  it('统计节点数与最大深度', () => {
    expect(summarizeJson('{"a":{"b":1}}')).toEqual({ valid: true, nodes: 3, depth: 2 });
  });

  it('非法 JSON 标记为 invalid', () => {
    expect(summarizeJson('oops')).toEqual({ valid: false, nodes: 0, depth: 0 });
  });

  it('标量根节点深度为 0', () => {
    expect(summarizeJson('"x"')).toEqual({ valid: true, nodes: 1, depth: 0 });
  });
});

describe('countOccurrences', () => {
  it('统计出现次数', () => {
    expect(countOccurrences('aXbXc', 'X')).toBe(2);
  });

  it('不重叠计数', () => {
    expect(countOccurrences('aaaa', 'aa')).toBe(2);
  });

  it('空关键字返回 0', () => {
    expect(countOccurrences('abc', '')).toBe(0);
  });

  it('空文本返回 0', () => {
    expect(countOccurrences('', 'a')).toBe(0);
  });

  it('正则元字符按字面量处理', () => {
    expect(countOccurrences('a.b.c', '.')).toBe(2);
  });
});

describe('filterLines', () => {
  it('只保留命中的行', () => {
    expect(filterLines('one\ntwo\nthree', 'o')).toBe('one\ntwo');
  });

  it('大小写不敏感', () => {
    expect(filterLines('Alpha\nbeta', 'ALPHA')).toBe('Alpha');
  });

  it('空关键字返回原文', () => {
    expect(filterLines('a\nb', '  ')).toBe('a\nb');
  });

  it('无命中返回空串', () => {
    expect(filterLines('a\nb', 'z')).toBe('');
  });
});

describe('headerRows', () => {
  it('按键名升序排列', () => {
    expect(headerRows({ b: '2', A: '1' })).toEqual([
      ['A', '1'],
      ['b', '2'],
    ]);
  });

  it('空对象返回空数组', () => {
    expect(headerRows({})).toEqual([]);
  });
});
