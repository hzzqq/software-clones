import { describe, it, expect } from 'vitest';
import { tokenizeCurl, parseCurlCommand, encodeBasicCredentials, keyValueToText } from './curl';
import { buildCurlCommand } from './http';

describe('tokenizeCurl', () => {
  it('按空白切分普通 token', () => {
    expect(tokenizeCurl('curl -X GET http://a.com')).toEqual(['curl', '-X', 'GET', 'http://a.com']);
  });

  it('单引号内的空格与冒号保持完整', () => {
    expect(tokenizeCurl("-H 'Content-Type: application/json'")).toEqual([
      '-H',
      'Content-Type: application/json',
    ]);
  });

  it('双引号支持 \\" 转义', () => {
    expect(tokenizeCurl('-d "{\\"a\\":1}"')).toEqual(['-d', '{"a":1}']);
  });

  it('反斜杠续行被忽略', () => {
    expect(tokenizeCurl("curl 'http://a.com' \\\n  -H 'X: 1'")).toEqual([
      'curl',
      'http://a.com',
      '-H',
      'X: 1',
    ]);
  });

  it('保留空引号 token', () => {
    expect(tokenizeCurl("-d ''")).toEqual(['-d', '']);
  });

  it('单引号内的双引号原样保留', () => {
    expect(tokenizeCurl(`-d '{"a":1}'`)).toEqual(['-d', '{"a":1}']);
  });

  it('空输入返回空数组', () => {
    expect(tokenizeCurl('   ')).toEqual([]);
  });
});

describe('parseCurlCommand', () => {
  it('解析最简 GET', () => {
    const d = parseCurlCommand('curl https://api.test/users');
    expect(d).not.toBeNull();
    expect(d!.method).toBe('GET');
    expect(d!.url).toBe('https://api.test/users');
    expect(d!.body).toBe('');
  });

  it('解析 -X 与多个 -H', () => {
    const d = parseCurlCommand(
      "curl -X PUT 'https://api.test/u/1' -H 'Accept: application/json' -H 'X-Trace: abc'",
    )!;
    expect(d.method).toBe('PUT');
    expect(d.headers).toEqual({ Accept: 'application/json', 'X-Trace': 'abc' });
  });

  it('有 body 且未指定方法时推断为 POST', () => {
    const d = parseCurlCommand(`curl https://api.test/x -d '{"a":1}'`)!;
    expect(d.method).toBe('POST');
    expect(d.body).toBe('{"a":1}');
  });

  it('JSON body 自动补 Content-Type: application/json', () => {
    const d = parseCurlCommand(`curl https://api.test/x -d '{"a":1}'`)!;
    expect(d.headers['Content-Type']).toBe('application/json');
  });

  it('非 JSON body 补表单 Content-Type', () => {
    const d = parseCurlCommand("curl https://api.test/x -d 'a=1'")!;
    expect(d.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('已显式给出 Content-Type 时不覆盖', () => {
    const d = parseCurlCommand(
      "curl https://api.test/x -H 'content-type: text/plain' -d 'hello'",
    )!;
    expect(d.headers['content-type']).toBe('text/plain');
    expect(d.headers['Content-Type']).toBeUndefined();
  });

  it('多个 -d 用 & 连接', () => {
    const d = parseCurlCommand("curl https://a.com -d 'a=1' -d 'b=2'")!;
    expect(d.body).toBe('a=1&b=2');
  });

  it('URL 查询串被拆进 params', () => {
    const d = parseCurlCommand("curl 'https://a.com/s?q=hi&page=2'")!;
    expect(d.url).toBe('https://a.com/s');
    expect(d.params).toEqual({ q: 'hi', page: '2' });
  });

  it('-u 转成 Basic Authorization 头', () => {
    const d = parseCurlCommand("curl https://a.com -u 'tom:pw'")!;
    expect(d.headers.Authorization).toBe(`Basic ${encodeBasicCredentials('tom', 'pw')}`);
  });

  it('--url 指定地址', () => {
    const d = parseCurlCommand("curl --url 'https://a.com/z'")!;
    expect(d.url).toBe('https://a.com/z');
  });

  it('无参 flag 被忽略且不当作 URL', () => {
    const d = parseCurlCommand('curl -s -i -k --compressed https://a.com')!;
    expect(d.url).toBe('https://a.com');
  });

  it('带值 flag 的值被跳过、不当作 URL', () => {
    const d = parseCurlCommand('curl -o out.txt --max-time 30 https://a.com')!;
    expect(d.url).toBe('https://a.com');
  });

  it('-A / -b / -e 映射到对应请求头', () => {
    const d = parseCurlCommand("curl https://a.com -A 'UA/1' -b 'k=v' -e 'https://ref'")!;
    expect(d.headers['User-Agent']).toBe('UA/1');
    expect(d.headers.Cookie).toBe('k=v');
    expect(d.headers.Referer).toBe('https://ref');
  });

  it('支持 -XPOST 紧凑写法', () => {
    const d = parseCurlCommand('curl -XPOST https://a.com')!;
    expect(d.method).toBe('POST');
  });

  it('支持 --request=DELETE 等号写法', () => {
    const d = parseCurlCommand('curl --request=DELETE https://a.com')!;
    expect(d.method).toBe('DELETE');
  });

  it('支持多行续行的真实 DevTools 复制格式', () => {
    const cmd = [
      "curl 'https://api.test/v1/items?limit=10' \\",
      "  -H 'accept: application/json' \\",
      "  -H 'authorization: Bearer xyz' \\",
      "  --data-raw '{\"n\":1}' \\",
      '  --compressed',
    ].join('\n');
    const d = parseCurlCommand(cmd)!;
    expect(d.method).toBe('POST');
    expect(d.url).toBe('https://api.test/v1/items');
    expect(d.params).toEqual({ limit: '10' });
    expect(d.headers.authorization).toBe('Bearer xyz');
    expect(d.body).toBe('{"n":1}');
  });

  it('没有 URL 时返回 null', () => {
    expect(parseCurlCommand('curl -X GET')).toBeNull();
  });

  it('空字符串返回 null', () => {
    expect(parseCurlCommand('')).toBeNull();
  });

  it('允许省略 curl 前缀', () => {
    const d = parseCurlCommand('https://a.com -X HEAD')!;
    expect(d.method).toBe('HEAD');
    expect(d.url).toBe('https://a.com');
  });

  it('导入后再导出可还原等价命令（往返）', () => {
    const original = "curl -X POST 'https://a.com/p?x=1' -H 'X-K: v' -d 'body=1'";
    const d = parseCurlCommand(original)!;
    const rebuilt = buildCurlCommand({
      method: d.method,
      url: d.url,
      headers: { 'X-K': d.headers['X-K'] },
      params: d.params,
      body: d.body,
    });
    const again = parseCurlCommand(rebuilt)!;
    expect(again.method).toBe('POST');
    expect(again.url).toBe('https://a.com/p');
    expect(again.params).toEqual({ x: '1' });
    expect(again.headers['X-K']).toBe('v');
    expect(again.body).toBe('body=1');
  });
});

describe('encodeBasicCredentials', () => {
  it('编码 ASCII 凭据', () => {
    expect(encodeBasicCredentials('user', 'pass')).toBe('dXNlcjpwYXNz');
  });

  it('编码含中文的凭据不抛错', () => {
    expect(() => encodeBasicCredentials('用户', '密码')).not.toThrow();
    expect(encodeBasicCredentials('用户', '密码').length).toBeGreaterThan(0);
  });

  it('空密码也能编码', () => {
    expect(encodeBasicCredentials('u', '')).toBe('dTo=');
  });
});

describe('keyValueToText', () => {
  it('序列化键值对', () => {
    expect(keyValueToText({ a: '1', b: '2' })).toBe('a=1\nb=2');
  });

  it('空对象返回空串', () => {
    expect(keyValueToText({})).toBe('');
  });
});
