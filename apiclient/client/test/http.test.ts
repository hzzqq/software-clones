import { describe, it, expect } from 'vitest';
import { parseQueryString, buildUrlWithQuery, statusFamily } from '../src/utils/http';

describe('parseQueryString', () => {
  it('解析多个 key=value 对', () => {
    expect(parseQueryString('a=1&b=2&c=3')).toEqual({ a: '1', b: '2', c: '3' });
  });
  it('对每个值做 URL 解码（%20 / %E4%B8%AD）', () => {
    expect(parseQueryString('a=hello%20world&b=%E4%B8%AD')).toEqual({ a: 'hello world', b: '中' });
  });
  it('c=%20 解码为空格', () => {
    expect(parseQueryString('a=1&b=2&c=%20')).toEqual({ a: '1', b: '2', c: ' ' });
  });
  it('空串与 "?" 均返回 {}', () => {
    expect(parseQueryString('')).toEqual({});
    expect(parseQueryString('?')).toEqual({});
  });
  it('去掉前导 ? 后解析', () => {
    expect(parseQueryString('?x=1&y=2')).toEqual({ x: '1', y: '2' });
  });
  it('忽略 key 为空或整体为空的片段', () => {
    expect(parseQueryString('=v&a=1&&b=2&')).toEqual({ a: '1', b: '2' });
  });
  it('不修改入参', () => {
    const input = 'a=1&b=2';
    parseQueryString(input);
    expect(input).toBe('a=1&b=2');
  });
});

describe('buildUrlWithQuery（复用 parseQueryString 解析已有查询串）', () => {
  it('baseUrl 已有 ? 时解析旧参数并与新参数合并', () => {
    expect(buildUrlWithQuery('https://x/api?x=0', { q: '1' })).toBe('https://x/api?x=0&q=1');
  });
  it('旧参数被同名新参数覆盖', () => {
    expect(buildUrlWithQuery('https://x/api?q=old', { q: 'new' })).toBe('https://x/api?q=new');
  });
  it('旧参数中的编码值被原样保留', () => {
    expect(buildUrlWithQuery('https://x/api?x=a%20b', { y: '2' })).toBe('https://x/api?x=a+b&y=2');
  });
});

describe('statusFamily', () => {
  it('200 → 成功', () => {
    expect(statusFamily(200)).toBe('成功');
  });
  it('301 → 重定向', () => {
    expect(statusFamily(301)).toBe('重定向');
  });
  it('404 → 客户端错误', () => {
    expect(statusFamily(404)).toBe('客户端错误');
  });
  it('500 → 服务端错误', () => {
    expect(statusFamily(500)).toBe('服务端错误');
  });
  it('0 → 未知', () => {
    expect(statusFamily(0)).toBe('未知');
  });
  it('418 → 客户端错误', () => {
    expect(statusFamily(418)).toBe('客户端错误');
  });
});
