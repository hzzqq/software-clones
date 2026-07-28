import { describe, it, expect } from 'vitest';
import {
  base64Encode,
  base64Decode,
  formatJson,
  minifyJson,
  jsonToYaml,
  yamlToJson,
  generateUuid,
  isValidUuid,
  urlEncode,
  urlDecode,
  timestampToIso,
  isoToTimestampSeconds,
  jsonToCsv,
  csvToJson,
  isValidJson,
  parseJson,
  compactNumber,
  slugify,
} from './tools';

describe('base64', () => {
  it('round-trips UTF-8 text', () => {
    const text = '你好，world! 🌟';
    expect(base64Decode(base64Encode(text))).toBe(text);
  });
  it('throws a friendly error on invalid input', () => {
    expect(() => base64Decode('@@not base64@@')).toThrow('无效的 Base64');
    expect(() => base64Decode('')).toThrow('Base64 输入为空');
  });
});

describe('json format', () => {
  it('pretty-prints and minifies', () => {
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(minifyJson('{"a": 1}')).toBe('{"a":1}');
  });
  it('throws on invalid json', () => {
    expect(() => formatJson('{bad')).toThrow();
  });
});

describe('json validation', () => {
  it('isValidJson accepts valid JSON (incl. primitives) and rejects invalid', () => {
    expect(isValidJson('{"a":1}')).toBe(true);
    expect(isValidJson('[1,2,3]')).toBe(true);
    expect(isValidJson('42')).toBe(true);
    expect(isValidJson('"hello"')).toBe(true);
    expect(isValidJson('')).toBe(false);
    expect(isValidJson('{bad')).toBe(false);
    expect(isValidJson('{"a":}')).toBe(false);
  });

  it('parseJson returns the value on success', () => {
    const r = parseJson('{"a":1}');
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ a: 1 });
    expect(r.line).toBeUndefined();
  });

  it('parseJson reports 1-based line/column for a positioned error', () => {
    // The stray "}" is on line 3, column 3 (after the leading spaces).
    const bad = '{\n  "a": 1,\n  }\n}';
    const r = parseJson(bad);
    expect(r.ok).toBe(false);
    expect(r.line).toBe(3);
    expect(r.column).toBe(3);
  });

  it('parseJson leaves line/column undefined when no position is given', () => {
    const r = parseJson('');
    expect(r.ok).toBe(false);
    expect(r.line).toBeUndefined();
    expect(r.column).toBeUndefined();
  });
});

describe('yaml', () => {
  it('converts json -> yaml -> json', () => {
    const json = '{"a":1,"b":[1,2]}';
    const yaml = jsonToYaml(json);
    expect(yamlToJson(yaml)).toBe(json);
  });
});

describe('uuid', () => {
  it('generates valid v4 uuids', () => {
    const u = generateUuid();
    expect(isValidUuid(u)).toBe(true);
    expect(isValidUuid('not-a-uuid')).toBe(false);
  });
});

describe('url', () => {
  it('encodes and decodes', () => {
    expect(urlEncode('a b')).toBe('a%20b');
    expect(urlDecode('a%20b')).toBe('a b');
  });
});

describe('timestamp', () => {
  it('converts seconds and milliseconds to ISO', () => {
    expect(timestampToIso('0')).toBe('1970-01-01T00:00:00.000Z');
    expect(timestampToIso('1700000000000')).toBe('2023-11-14T22:13:20.000Z');
  });
  it('round-trips iso -> seconds', () => {
    expect(isoToTimestampSeconds('1970-01-01T00:00:00.000Z')).toBe('0');
    expect(() => isoToTimestampSeconds('nope')).toThrow();
  });
});

describe('json <-> csv', () => {
  const data = [
    { name: 'A', age: 1 },
    { name: 'B', age: 2 },
  ];
  it('converts json to csv with header', () => {
    const csv = jsonToCsv(JSON.stringify(data));
    expect(csv).toBe('name,age\nA,1\nB,2');
  });
  it('converts csv back to json', () => {
    const json = csvToJson('name,age\nA,1\nB,2');
    expect(JSON.parse(json)).toEqual([
      { name: 'A', age: 1 },
      { name: 'B', age: 2 },
    ]);
  });
  it('round-trips with quoted fields containing delimiters', () => {
    const csv = jsonToCsv(JSON.stringify([{ note: 'he said "hi, there"' }]));
    expect(csvToJson(csv)).toContain('hi, there');
  });
  it('coerces numeric cells and nulls empty cells', () => {
    const json = csvToJson('a,b\n5,\n,7');
    const parsed = JSON.parse(json);
    expect(parsed[0]).toEqual({ a: 5, b: null });
    expect(parsed[1]).toEqual({ a: null, b: 7 });
  });
  it('throws when root is not an array', () => {
    expect(() => jsonToCsv('{"a":1}')).toThrow('数组');
  });
});

describe('compactNumber', () => {
  it('小于 1000 原样返回', () => {
    expect(compactNumber(0)).toBe('0');
    expect(compactNumber(42)).toBe('42');
    expect(compactNumber(999)).toBe('999');
  });
  it('千/百万/十亿 缩写', () => {
    expect(compactNumber(1500)).toBe('1.5k');
    expect(compactNumber(2500000)).toBe('2.5M');
    expect(compactNumber(3000000000)).toBe('3B');
  });
  it('百位以上取整，以下保留一位小数', () => {
    expect(compactNumber(123456)).toBe('123.5k');
    expect(compactNumber(1200)).toBe('1.2k');
  });
  it('非有限值回退 0', () => {
    expect(compactNumber(NaN)).toBe('0');
    expect(compactNumber(Infinity)).toBe('0');
  });
});

describe('slugify', () => {
  it('默认短横分隔符，转小写去空格', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
  });
  it('剥离变音符号（Unicode NFKD）', () => {
    expect(slugify('Café Déjà Vu')).toBe('cafe-deja-vu');
  });
  it('保留非 ASCII 字母数字（如中文）', () => {
    expect(slugify('你好 World 123')).toBe('你好-world-123');
  });
  it('下划线分隔符正常工作', () => {
    expect(slugify('Hello World', '_')).toBe('hello_world');
  });
  it('点号分隔符不再清空结果（修复正则元字符 bug）', () => {
    expect(slugify('Hello World', '.')).toBe('hello.world');
  });
  it('去除首尾分隔符', () => {
    expect(slugify('  -Hello-  ', '-')).toBe('hello');
  });
  it('空输入返回空串', () => {
    expect(slugify('')).toBe('');
    expect(slugify(null as unknown as string)).toBe('');
  });
});
