import { describe, it, expect } from 'vitest';
import { parseHeadersText, headersToText, parseKeyValueText, statusKind, tryPrettyJson } from './http';

describe('parseHeadersText', () => {
  it('解析多行 header', () => {
    expect(parseHeadersText('Content-Type: application/json\nAccept: */*')).toEqual({
      'Content-Type': 'application/json',
      Accept: '*/*',
    });
  });
  it('忽略格式错误行', () => {
    expect(parseHeadersText('no colon here')).toEqual({});
  });
});

describe('headersToText', () => {
  it('对象转文本', () => {
    expect(headersToText({ A: '1', B: '2' })).toBe('A: 1\nB: 2');
  });
});

describe('parseKeyValueText', () => {
  it('解析 params', () => {
    expect(parseKeyValueText('q=hello\npage=2')).toEqual({ q: 'hello', page: '2' });
  });
});

describe('statusKind', () => {
  it('2xx success', () => {
    expect(statusKind(200)).toBe('success');
    expect(statusKind(204)).toBe('success');
  });
  it('3xx info', () => {
    expect(statusKind(301)).toBe('info');
  });
  it('4xx warning', () => {
    expect(statusKind(404)).toBe('warning');
  });
  it('5xx / 0 error', () => {
    expect(statusKind(500)).toBe('error');
    expect(statusKind(0)).toBe('error');
  });
});

describe('tryPrettyJson', () => {
  it('美化合法 JSON', () => {
    expect(tryPrettyJson('{"a":1}')).toBe('{\n  "a": 1\n}');
  });
  it('非法 JSON 原样返回', () => {
    expect(tryPrettyJson('not json')).toBe('not json');
  });
});
