import { describe, expect, it } from 'vitest';
import { normalizeUrl, urlKey, extractDomain, faviconUrl } from './url';

describe('normalizeUrl', () => {
  it('补全缺失协议', () => {
    expect(normalizeUrl('example.com')).toBe('http://example.com');
    expect(normalizeUrl('www.example.com')).toBe('http://www.example.com');
  });

  it('主机名小写并去掉默认端口', () => {
    expect(normalizeUrl('HTTP://EXAMPLE.COM:80')).toBe('http://example.com');
    expect(normalizeUrl('https://Example.com:443/')).toBe('https://example.com');
  });

  it('去掉结尾斜杠与锚点', () => {
    expect(normalizeUrl('https://example.com/docs/')).toBe('https://example.com/docs');
    expect(normalizeUrl('https://example.com/#section')).toBe('https://example.com');
  });

  it('保留查询串，空输入返回空串', () => {
    expect(normalizeUrl('https://example.com/search?q=a')).toBe('https://example.com/search?q=a');
    expect(normalizeUrl('   ')).toBe('');
  });
});

describe('urlKey（www/http/https 归一化）', () => {
  it('三种写法视为同一书签', () => {
    const a = urlKey(normalizeUrl('https://www.example.com/docs/'));
    const b = urlKey(normalizeUrl('http://example.com/docs'));
    const c = urlKey(normalizeUrl('example.com/docs'));
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('不同路径与不同查询串不合并', () => {
    expect(urlKey(normalizeUrl('https://example.com/a'))).not.toBe(
      urlKey(normalizeUrl('https://example.com/b')),
    );
    expect(urlKey(normalizeUrl('https://example.com/s?q=1'))).not.toBe(
      urlKey(normalizeUrl('https://example.com/s?q=2')),
    );
  });
});

describe('extractDomain / faviconUrl', () => {
  it('提取主机名并生成 favicon 地址', () => {
    expect(extractDomain('https://www.example.com/a')).toBe('www.example.com');
    expect(faviconUrl('https://example.com/a')).toBe('https://example.com/favicon.ico');
    expect(faviconUrl('not-a-url')).toBe('');
  });
});
