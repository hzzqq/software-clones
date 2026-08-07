import { describe, it, expect } from 'vitest';
import { normalizeFeedUrl } from './feedUrl';

describe('normalizeFeedUrl', () => {
  it('keeps valid http(s) urls', () => {
    expect(normalizeFeedUrl('https://example.com/feed.xml')).toBe('https://example.com/feed.xml');
    expect(normalizeFeedUrl('http://example.com/rss')).toBe('http://example.com/rss');
  });

  it('prepends https:// when missing', () => {
    expect(normalizeFeedUrl('example.com/feed')).toBe('https://example.com/feed');
  });

  it('trims whitespace', () => {
    expect(normalizeFeedUrl('  https://example.com/feed  ')).toBe('https://example.com/feed');
  });

  it('rejects invalid input', () => {
    expect(normalizeFeedUrl('not a url')).toBe('');
    expect(normalizeFeedUrl('')).toBe('');
    expect(normalizeFeedUrl('javascript:alert(1)')).toBe('');
    expect(normalizeFeedUrl('ftp://example.com/feed')).toBe('');
  });
});
