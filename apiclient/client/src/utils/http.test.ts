import { describe, it, expect } from 'vitest';
import { parseHeadersText, headersToText, parseKeyValueText, statusKind, tryPrettyJson, matchRequest, matchHistory, buildCurlCommand, sortRequests, groupByMethod, buildUrlWithQuery, statusText, byteLengthOf, formatBytes, getResponseMediaType, formatResponseBody, methodColor, mergeHeaders } from './http';

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

describe('buildUrlWithQuery', () => {
  it('无 params 时原样返回', () => {
    expect(buildUrlWithQuery('https://x/api')).toBe('https://x/api');
  });
  it('拼接 query 字符串', () => {
    expect(buildUrlWithQuery('https://x/api', { q: '1', page: '2' })).toBe('https://x/api?q=1&page=2');
  });
  it('baseUrl 已有 ? 时以 & 追加', () => {
    expect(buildUrlWithQuery('https://x/api?x=0', { q: '1' })).toBe('https://x/api?x=0&q=1');
  });
  it('空值 params 视为无参数', () => {
    expect(buildUrlWithQuery('https://x/api', {})).toBe('https://x/api');
  });
  it('特殊字符被编码', () => {
    expect(buildUrlWithQuery('https://x/api', { q: 'a b' })).toBe('https://x/api?q=a+b');
  });
  it('不修改入参', () => {
    const p = { q: '1' };
    buildUrlWithQuery('https://x/api', p);
    expect(p).toEqual({ q: '1' });
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

describe('statusText', () => {
  it('常见 2xx', () => {
    expect(statusText(200)).toBe('OK');
    expect(statusText(201)).toBe('Created');
  });
  it('3xx 重定向', () => {
    expect(statusText(301)).toBe('Moved Permanently');
    expect(statusText(304)).toBe('Not Modified');
  });
  it('4xx / 5xx', () => {
    expect(statusText(400)).toBe('Bad Request');
    expect(statusText(404)).toBe('Not Found');
    expect(statusText(500)).toBe('Internal Server Error');
  });
  it('0 表示网络错误', () => {
    expect(statusText(0)).toBe('网络错误');
  });
  it('未知码回退', () => {
    expect(statusText(418)).toBe('状态码 418');
  });
});

describe('byteLengthOf', () => {
  it('returns 0 for empty input', () => {
    expect(byteLengthOf('')).toBe(0);
  });
  it('counts ASCII as 1 byte each', () => {
    expect(byteLengthOf('hello')).toBe(5);
  });
  it('counts Chinese (3 bytes each) correctly', () => {
    expect(byteLengthOf('你好')).toBe(6);
  });
  it('counts mixed content correctly', () => {
    expect(byteLengthOf('a你b好')).toBe(8);
  });
});

describe('formatBytes', () => {
  it('formats bytes under 1 KB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
  });
  it('formats KB', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
  it('formats MB', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });
  it('falls back on negative / non-finite', () => {
    expect(formatBytes(-1)).toBe('0 B');
    expect(formatBytes(NaN)).toBe('0 B');
  });
});

describe('getResponseMediaType', () => {
  it('识别 json（含 charset 后缀）', () => {
    expect(getResponseMediaType({ 'Content-Type': 'application/json; charset=utf-8' })).toBe('json');
    expect(getResponseMediaType({ 'content-type': 'application/json' })).toBe('json');
  });
  it('识别 html / xml / text', () => {
    expect(getResponseMediaType({ 'Content-Type': 'text/html' })).toBe('html');
    expect(getResponseMediaType({ 'Content-Type': 'application/xml' })).toBe('xml');
    expect(getResponseMediaType({ 'Content-Type': 'text/plain' })).toBe('text');
  });
  it('无 content-type 或未知类型回退 other', () => {
    expect(getResponseMediaType({})).toBe('other');
    expect(getResponseMediaType({ 'Content-Type': 'image/png' })).toBe('other');
  });
  it('不修改入参', () => {
    const h = { 'Content-Type': 'application/json' };
    getResponseMediaType(h);
    expect(h).toEqual({ 'Content-Type': 'application/json' });
  });
});

describe('formatResponseBody', () => {
  it('json 类型自动美化', () => {
    const headers = { 'Content-Type': 'application/json' };
    expect(formatResponseBody('{"a":1}', headers)).toBe('{\n  "a": 1\n}');
  });
  it('非 json 类型原样返回（HTML/XML/纯文本）', () => {
    expect(formatResponseBody('<a>1</a>', { 'Content-Type': 'text/html' })).toBe('<a>1</a>');
    expect(formatResponseBody('hello', {})).toBe('hello');
  });
  it('非法 json 即使标为 json 也原样返回', () => {
    expect(formatResponseBody('not json', { 'Content-Type': 'application/json' })).toBe('not json');
  });
  it('不修改入参', () => {
    const h = { 'Content-Type': 'application/json' };
    const copy = JSON.parse(JSON.stringify(h));
    formatResponseBody('{"a":1}', h);
    expect(h).toEqual(copy);
  });
});

describe('methodColor', () => {
  it('GET → success', () => {
    expect(methodColor('GET')).toBe('success');
  });
  it('POST → info', () => {
    expect(methodColor('POST')).toBe('info');
  });
  it('PUT / PATCH → warning', () => {
    expect(methodColor('PUT')).toBe('warning');
    expect(methodColor('PATCH')).toBe('warning');
  });
  it('DELETE → error', () => {
    expect(methodColor('DELETE')).toBe('error');
  });
  it('其余方法(HEAD/OPTIONS/未知) → primary', () => {
    expect(methodColor('HEAD')).toBe('primary');
    expect(methodColor('OPTIONS')).toBe('primary');
    expect(methodColor('FOO')).toBe('primary');
  });
});

describe('mergeHeaders', () => {
  it('自定义头覆盖默认头(同键)', () => {
    const out = mergeHeaders({ 'Content-Type': 'application/json' }, { 'Content-Type': 'text/plain' });
    expect(out).toEqual({ 'Content-Type': 'text/plain' });
  });
  it('大小写不敏感合并(不同写法视为同键)', () => {
    const out = mergeHeaders({ 'content-type': 'application/json' }, { 'Content-Type': 'text/plain' });
    // 默认先写入 content-type，自定义键不同写法应替换而非并存
    expect(Object.keys(out)).toEqual(['Content-Type']);
    expect(out['Content-Type']).toBe('text/plain');
  });
  it('默认头保留在自定义未覆盖时', () => {
    expect(mergeHeaders({ Accept: '*/*' }, { Authorization: 'Bearer x' })).toEqual({
      Accept: '*/*',
      Authorization: 'Bearer x',
    });
  });
  it('入参为空安全返回', () => {
    expect(mergeHeaders(null, undefined)).toEqual({});
    expect(mergeHeaders({ a: '1' }, null)).toEqual({ a: '1' });
  });
  it('不修改入参', () => {
    const d = { a: '1' };
    const c = { b: '2' };
    mergeHeaders(d, c);
    expect(d).toEqual({ a: '1' });
    expect(c).toEqual({ b: '2' });
  });
});
