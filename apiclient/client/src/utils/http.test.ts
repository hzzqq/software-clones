import { describe, it, expect } from 'vitest';
import { parseHeadersText, headersToText, parseKeyValueText, statusKind, tryPrettyJson, matchRequest, matchHistory, buildCurlCommand, sortRequests, groupByMethod } from './http';

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
  it('兼容 Windows CRLF（值不含残留 \\r）', () => {
    expect(parseHeadersText('A: 1\r\nB: 2\r\n')).toEqual({ A: '1', B: '2' });
  });
  it('保留值中的冒号（如 Date 头）', () => {
    expect(parseHeadersText('Date: Wed, 21 Oct 2026 07:28:00 GMT')).toEqual({
      Date: 'Wed, 21 Oct 2026 07:28:00 GMT',
    });
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
  it('兼容 Windows CRLF', () => {
    expect(parseKeyValueText('q=hello\r\npage=2\r')).toEqual({ q: 'hello', page: '2' });
  });
  it('值中的 = 被保留（仅首个 = 作为分隔）', () => {
    expect(parseKeyValueText('token=abc=def')).toEqual({ token: 'abc=def' });
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

describe('matchRequest', () => {
  const req = { method: 'GET', name: '登录取用户', url: 'https://api.x/user' };
  it('空白关键字匹配全部', () => {
    expect(matchRequest('', req)).toBe(true);
  });
  it('按名称/URL 匹配（忽略大小写）', () => {
    expect(matchRequest('登录', req)).toBe(true);
    expect(matchRequest('API.X', req)).toBe(true);
    expect(matchRequest('post', req)).toBe(false);
  });
});

describe('matchHistory', () => {
  const hist = { method: 'POST', url: 'https://api.x/login', status: 401 };
  it('按 方法/URL/状态 匹配', () => {
    expect(matchHistory('401', hist)).toBe(true);
    expect(matchHistory('login', hist)).toBe(true);
    expect(matchHistory('get', hist)).toBe(false);
  });
});

describe('buildCurlCommand', () => {
  it('基础 GET 无参数单行', () => {
    expect(buildCurlCommand({ method: 'GET', url: 'https://x/api' })).toBe("curl -X GET 'https://x/api'");
  });
  it('带 query/headers/body 多行拼接', () => {
    const out = buildCurlCommand({
      method: 'POST',
      url: 'https://x/api',
      params: { q: '1' },
      headers: { Authorization: 'Bearer t' },
      body: '{"a":1}',
    });
    expect(out).toContain("curl -X POST 'https://x/api?q=1'");
    expect(out).toContain("-H 'Authorization: Bearer t'");
    expect(out).toContain("-d '{\"a\":1}'");
  });
  it('body 中的单引号被转义', () => {
    expect(buildCurlCommand({ method: 'POST', url: 'u', body: "it's" })).toContain("-d 'it'\\''s'");
  });
});

describe('sortRequests', () => {
  const reqs = [
    { method: 'GET', name: 'Beta', url: 'https://x/b', createdAt: '2026-01-01', updatedAt: '2026-02-01' },
    { method: 'POST', name: 'Alpha', url: 'https://x/a', createdAt: '2026-03-01', updatedAt: '2026-01-01' },
    { method: 'GET', name: '', url: 'https://x/c', createdAt: '2026-02-01', updatedAt: '2026-03-01' },
  ];
  it('默认按名称升序（无名称置后）', () => {
    expect(sortRequests(reqs).map((r) => r.name)).toEqual(['Alpha', 'Beta', '']);
  });
  it('按方法升序', () => {
    expect(sortRequests(reqs, 'method').map((r) => r.method)).toEqual(['GET', 'GET', 'POST']);
  });
  it('按创建时间倒序', () => {
    const out = sortRequests(reqs, 'createdAt');
    expect(out[0].createdAt).toBe('2026-03-01');
    expect(out[2].createdAt).toBe('2026-01-01');
  });
  it('按更新时间倒序', () => {
    expect(sortRequests(reqs, 'updatedAt')[0].updatedAt).toBe('2026-03-01');
  });
  it('不修改入参', () => {
    const copy = JSON.parse(JSON.stringify(reqs));
    sortRequests(reqs, 'name');
    expect(reqs).toEqual(copy);
  });
});

describe('groupByMethod', () => {
  const reqs = [
    { method: 'get', name: 'a' },
    { method: 'POST', name: 'b' },
    { method: 'get', name: 'c' },
    { method: 'DELETE', name: 'd' },
    { method: 'custom', name: 'e' },
  ];
  it('按方法分组并保留组内顺序', () => {
    const g = groupByMethod(reqs);
    expect(g.GET.map((r) => r.name)).toEqual(['a', 'c']);
    expect(g.POST.map((r) => r.name)).toEqual(['b']);
    expect(g.DELETE.map((r) => r.name)).toEqual(['d']);
    expect(g.CUSTOM.map((r) => r.name)).toEqual(['e']);
  });
  it('组间按 canonical 顺序（GET/POST/.../未知）', () => {
    const g = groupByMethod(reqs);
    expect(Object.keys(g)).toEqual(['GET', 'POST', 'DELETE', 'CUSTOM']);
  });
  it('方法名统一大写', () => {
    const g = groupByMethod([{ method: 'get' }]);
    expect(Object.keys(g)).toEqual(['GET']);
  });
  it('不修改入参', () => {
    const copy = JSON.parse(JSON.stringify(reqs));
    groupByMethod(reqs);
    expect(reqs).toEqual(copy);
  });
});
