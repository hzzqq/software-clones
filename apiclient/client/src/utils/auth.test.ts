import { describe, it, expect } from 'vitest';
import {
  buildAuthHeaders,
  buildAuthParams,
  isAuthComplete,
  mergeHeadersText,
  mergeParamsText,
  EMPTY_AUTH,
  AUTH_TYPE_LABELS,
  type AuthConfig,
} from './auth';
import { encodeBasicCredentials } from './curl';

describe('buildAuthHeaders', () => {
  it('none 返回空对象', () => {
    expect(buildAuthHeaders({ type: 'none' })).toEqual({});
  });

  it('bearer 生成 Authorization 头', () => {
    expect(buildAuthHeaders({ type: 'bearer', token: 'abc' })).toEqual({
      Authorization: 'Bearer abc',
    });
  });

  it('bearer 令牌为空时不产生半成品头', () => {
    expect(buildAuthHeaders({ type: 'bearer', token: '   ' })).toEqual({});
  });

  it('basic 生成 Base64 凭据', () => {
    expect(buildAuthHeaders({ type: 'basic', username: 'user', password: 'pass' })).toEqual({
      Authorization: `Basic ${encodeBasicCredentials('user', 'pass')}`,
    });
  });

  it('basic 用户名密码均为空时返回空', () => {
    expect(buildAuthHeaders({ type: 'basic', username: '', password: '' })).toEqual({});
  });

  it('apikey 放到请求头', () => {
    expect(
      buildAuthHeaders({ type: 'apikey', keyName: 'X-Key', keyValue: 'v', addTo: 'header' }),
    ).toEqual({ 'X-Key': 'v' });
  });

  it('apikey 放到查询串时不产生请求头', () => {
    expect(
      buildAuthHeaders({ type: 'apikey', keyName: 'X-Key', keyValue: 'v', addTo: 'query' }),
    ).toEqual({});
  });

  it('apikey 缺少键名时返回空', () => {
    expect(buildAuthHeaders({ type: 'apikey', keyName: ' ', keyValue: 'v' })).toEqual({});
  });
});

describe('buildAuthParams', () => {
  it('apikey + query 生成查询参数', () => {
    expect(
      buildAuthParams({ type: 'apikey', keyName: 'token', keyValue: 't', addTo: 'query' }),
    ).toEqual({ token: 't' });
  });

  it('apikey 默认放请求头，不产生参数', () => {
    expect(buildAuthParams({ type: 'apikey', keyName: 'token', keyValue: 't' })).toEqual({});
  });

  it('非 apikey 类型返回空', () => {
    expect(buildAuthParams({ type: 'bearer', token: 'x' })).toEqual({});
  });
});

describe('isAuthComplete', () => {
  it('默认空配置不完整', () => {
    expect(isAuthComplete(EMPTY_AUTH)).toBe(false);
  });

  it('填入 bearer 令牌后完整', () => {
    const cfg: AuthConfig = { ...EMPTY_AUTH, type: 'bearer', token: 't' };
    expect(isAuthComplete(cfg)).toBe(true);
  });

  it('apikey 放查询串同样算完整', () => {
    const cfg: AuthConfig = {
      ...EMPTY_AUTH,
      type: 'apikey',
      keyName: 'k',
      keyValue: 'v',
      addTo: 'query',
    };
    expect(isAuthComplete(cfg)).toBe(true);
  });
});

describe('mergeHeadersText', () => {
  it('追加新头', () => {
    expect(mergeHeadersText('Accept: a', { 'X-K': 'v' })).toBe('Accept: a\nX-K: v');
  });

  it('同名头（大小写不敏感）被覆盖而非重复', () => {
    expect(mergeHeadersText('authorization: old', { Authorization: 'new' })).toBe(
      'Authorization: new',
    );
  });

  it('空文本时直接写入', () => {
    expect(mergeHeadersText('', { A: '1' })).toBe('A: 1');
  });

  it('空新增时保留原有内容', () => {
    expect(mergeHeadersText('A: 1', {})).toBe('A: 1');
  });

  it('不修改入参对象', () => {
    const add = { A: '1' };
    mergeHeadersText('B: 2', add);
    expect(add).toEqual({ A: '1' });
  });
});

describe('mergeParamsText', () => {
  it('追加新参数', () => {
    expect(mergeParamsText('a=1', { b: '2' })).toBe('a=1\nb=2');
  });

  it('同名参数被覆盖', () => {
    expect(mergeParamsText('a=1', { a: '9' })).toBe('a=9');
  });

  it('空文本时直接写入', () => {
    expect(mergeParamsText('', { a: '1' })).toBe('a=1');
  });
});

describe('AUTH_TYPE_LABELS', () => {
  it('覆盖全部鉴权类型', () => {
    expect(Object.keys(AUTH_TYPE_LABELS).sort()).toEqual(
      ['apikey', 'basic', 'bearer', 'none'].sort(),
    );
  });
});
