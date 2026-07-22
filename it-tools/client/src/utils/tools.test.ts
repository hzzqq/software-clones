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
