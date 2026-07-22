import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import {
  base64Encode,
  base64Decode,
  formatJson,
  minifyJson,
  jsonToYaml,
  yamlToJson,
  generateUuid,
  generateUuidFallback,
  isValidUuid,
  urlEncode,
  urlEncodeComponent,
  urlDecode,
  timestampToIso,
  isoToTimestampSeconds,
} from '../src/utils/tools';

describe('base64 helpers', () => {
  it('encodes ASCII', () => {
    expect(base64Encode('hello')).toBe('aGVsbG8=');
  });

  it('encodes UTF-8 (multi-byte)', () => {
    expect(base64Encode('你好')).toBe('5L2g5aW9');
  });

  it('encodes empty string', () => {
    expect(base64Encode('')).toBe('');
  });

  it('decodes ASCII', () => {
    expect(base64Decode('aGVsbG8=')).toBe('hello');
  });

  it('decodes UTF-8', () => {
    expect(base64Decode('5L2g5aW9')).toBe('你好');
  });

  it('round-trips arbitrary unicode', () => {
    const text = '任意文本 ✅🚀';
    expect(base64Decode(base64Encode(text))).toBe(text);
  });

  it('throws on invalid base64 input', () => {
    expect(() => base64Decode('!!! not base64 !!!')).toThrow();
  });
});

describe('json helpers', () => {
  it('pretty-prints JSON and preserves values', () => {
    const input = '{"b":2,"a":1}';
    const out = formatJson(input);
    expect(out).toContain('\n');
    expect(JSON.parse(out)).toEqual(JSON.parse(input));
  });

  it('minifies JSON', () => {
    expect(minifyJson('{\n  "a": 1\n}')).toBe('{"a":1}');
  });

  it('throws on invalid JSON (format)', () => {
    expect(() => formatJson('{bad')).toThrow();
  });

  it('throws on invalid JSON (minify)', () => {
    expect(() => minifyJson('not json')).toThrow();
  });
});

describe('yaml helpers', () => {
  it('converts JSON to YAML', () => {
    const yamlText = jsonToYaml('{"foo":"bar"}');
    expect(yamlText).toContain('foo: bar');
    expect(yaml.load(yamlText)).toEqual({ foo: 'bar' });
  });

  it('converts YAML to JSON', () => {
    const jsonText = yamlToJson('foo: bar\n');
    expect(JSON.parse(jsonText)).toEqual({ foo: 'bar' });
  });

  it('throws when JSON source is invalid', () => {
    expect(() => jsonToYaml('{not json')).toThrow();
  });
});

describe('uuid helpers', () => {
  it('validates a v4 uuid', () => {
    expect(isValidUuid('00000000-0000-4000-8000-000000000000')).toBe(true);
  });

  it('rejects a non-v4 uuid (e.g. v1)', () => {
    expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(false);
  });

  it('rejects garbage', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
  });

  it('fallback generator produces a valid v4 uuid', () => {
    expect(isValidUuid(generateUuidFallback())).toBe(true);
  });

  it('generateUuid produces a valid v4 uuid', () => {
    expect(isValidUuid(generateUuid())).toBe(true);
  });
});

describe('url helpers', () => {
  it('encodes with encodeURI', () => {
    expect(urlEncode('https://example.com/a b')).toBe('https://example.com/a%20b');
  });

  it('encodes with encodeURIComponent', () => {
    expect(urlEncodeComponent('a b&c')).toBe('a%20b%26c');
  });

  it('decodes', () => {
    expect(urlDecode('a%20b%26c')).toBe('a b&c');
    expect(urlDecode('%E4%BD%A0')).toBe('你');
  });

  it('round-trips', () => {
    const s = 'a b&c=1+2/3';
    expect(urlDecode(urlEncodeComponent(s))).toBe(s);
  });
});

describe('timestamp helpers', () => {
  it('converts epoch seconds to ISO', () => {
    expect(timestampToIso('0')).toBe('1970-01-01T00:00:00.000Z');
  });

  it('treats <=10 digit numbers as seconds', () => {
    expect(timestampToIso('1700000000')).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it('treats >10 digit numbers as milliseconds', () => {
    expect(timestampToIso(1700000000000)).toBe(new Date(1700000000000).toISOString());
  });

  it('throws on non-numeric input', () => {
    expect(() => timestampToIso('abc')).toThrow();
    expect(() => timestampToIso('')).toThrow();
  });

  it('converts ISO to epoch seconds', () => {
    expect(isoToTimestampSeconds('1970-01-01T00:00:00.000Z')).toBe('0');
    expect(isoToTimestampSeconds('2023-11-14T22:13:20.000Z')).toBe(
      String(Math.floor(new Date('2023-11-14T22:13:20.000Z').getTime() / 1000))
    );
  });

  it('throws on invalid date', () => {
    expect(() => isoToTimestampSeconds('not a date')).toThrow();
  });
});
