import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, urlKey, extractDomain } from './url';

test('normalizeUrl: 补全缺失协议', () => {
  assert.equal(normalizeUrl('example.com'), 'http://example.com');
  assert.equal(normalizeUrl('www.example.com'), 'http://www.example.com');
});

test('normalizeUrl: 主机名小写、去掉默认端口', () => {
  assert.equal(normalizeUrl('HTTP://EXAMPLE.COM:80'), 'http://example.com');
  assert.equal(normalizeUrl('https://Example.com:443/'), 'https://example.com');
});

test('normalizeUrl: 去掉结尾斜杠与锚点', () => {
  assert.equal(normalizeUrl('https://example.com/docs/'), 'https://example.com/docs');
  assert.equal(normalizeUrl('https://example.com/#section'), 'https://example.com');
  assert.equal(normalizeUrl('https://example.com'), 'https://example.com');
});

test('normalizeUrl: 保留查询串，空输入返回空串', () => {
  assert.equal(normalizeUrl('https://example.com/search?q=a&n=1'), 'https://example.com/search?q=a&n=1');
  assert.equal(normalizeUrl('   '), '');
});

test('normalizeUrl: 非默认端口保留', () => {
  assert.equal(normalizeUrl('http://localhost:3000/app'), 'http://localhost:3000/app');
});

test('urlKey: www/http/https 视为同一', () => {
  const a = urlKey(normalizeUrl('https://www.example.com/docs/'));
  const b = urlKey(normalizeUrl('http://example.com/docs'));
  const c = urlKey(normalizeUrl('example.com/docs'));
  assert.equal(a, b);
  assert.equal(b, c);
});

test('urlKey: 不同路径仍视为不同', () => {
  const a = urlKey(normalizeUrl('https://example.com/a'));
  const b = urlKey(normalizeUrl('https://example.com/b'));
  assert.notEqual(a, b);
});

test('urlKey: 查询串参与去重', () => {
  const a = urlKey(normalizeUrl('https://example.com/search?q=1'));
  const b = urlKey(normalizeUrl('https://example.com/search?q=2'));
  assert.notEqual(a, b);
});

test('urlKey: 非法输入回落为小写原样', () => {
  assert.equal(urlKey('not a url'), 'not a url');
});

test('extractDomain: 提取主机名', () => {
  assert.equal(extractDomain('https://www.example.com/a'), 'www.example.com');
  assert.equal(extractDomain('not-a-url'), '');
});
