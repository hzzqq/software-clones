import { describe, it, expect } from 'vitest';
import {
  decodeXmlText,
  extractFirstTag,
  extractAllTags,
  extractAttr,
  parseRss,
  toIsoDate,
} from '../src/lib/xml';

describe('decodeXmlText', () => {
  it('decodes standard entities', () => {
    expect(decodeXmlText('a &amp; b &lt;tag&gt; &quot;q&quot; &apos;s&apos;')).toBe(
      'a & b <tag> "q" \'s\''
    );
  });

  it('decodes numeric entities', () => {
    expect(decodeXmlText('&#65;&#x42;&#x1F600;')).toBe('AB\u{1F600}');
  });

  it('keeps CDATA content intact (no entity decoding inside)', () => {
    const xml = '<![CDATA[<b>&amp; 原始内容</b>]]>';
    expect(decodeXmlText(xml)).toBe('<b>&amp; 原始内容</b>');
  });

  it('decodes entities outside CDATA but not inside', () => {
    const xml = '标题 &amp; 更多 <![CDATA[&lt;b&gt;]]>';
    expect(decodeXmlText(xml)).toBe('标题 & 更多 <![CDATA[&lt;b&gt;]]>'.replace('<![CDATA[&lt;b&gt;]]>', '&lt;b&gt;'));
  });

  it('handles empty input', () => {
    expect(decodeXmlText('')).toBe('');
  });
});

describe('tag extraction', () => {
  const xml =
    '<channel><title>频道标题</title><link>https://example.com</link>' +
    '<item><title>文章一</title><link>https://example.com/1</link></item>' +
    '<item><title>文章二</title><link>https://example.com/2</link></item></channel>';

  it('extracts the first tag content', () => {
    expect(extractFirstTag(xml, 'title')).toBe('频道标题');
    expect(extractFirstTag(xml, 'channel')).toContain('文章一');
  });

  it('extracts all tag contents in order', () => {
    const titles = extractAllTags(xml, 'item');
    expect(titles).toHaveLength(2);
    expect(extractFirstTag(titles[1], 'title')).toBe('文章二');
  });

  it('extracts an attribute value', () => {
    const atom = '<link href="https://example.com/atom"/>';
    expect(extractAttr(atom, 'link', 'href')).toBe('https://example.com/atom');
  });

  it('returns empty when not found', () => {
    expect(extractFirstTag(xml, 'missing')).toBe('');
    expect(extractAllTags(xml, 'missing')).toEqual([]);
  });
});

describe('parseRss (RSS 2.0)', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>示例频道</title>
    <link>https://example.com</link>
    <description>频道简介</description>
    <item>
      <title>第一篇文章 &amp; 标题</title>
      <link>https://example.com/posts/1</link>
      <description><![CDATA[<p>第一段 <b>加粗</b></p>]]></description>
      <content:encoded><![CDATA[<p>完整内容</p>]]></content:encoded>
      <author>作者甲</author>
      <pubDate>Tue, 04 Jun 2024 08:30:00 GMT</pubDate>
      <guid>https://example.com/posts/1</guid>
    </item>
    <item>
      <title>第二篇</title>
      <link>https://example.com/posts/2</link>
      <description>普通描述</description>
      <pubDate>2024-06-03T10:00:00Z</pubDate>
    </item>
  </channel>
</rss>`;

  const parsed = parseRss(xml);

  it('parses channel metadata', () => {
    expect(parsed.title).toBe('示例频道');
    expect(parsed.link).toBe('https://example.com');
    expect(parsed.description).toBe('频道简介');
  });

  it('parses items with CDATA + entities', () => {
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0].title).toBe('第一篇文章 & 标题');
    expect(parsed.items[0].link).toBe('https://example.com/posts/1');
    expect(parsed.items[0].description).toBe('<p>第一段 <b>加粗</b></p>');
    expect(parsed.items[0].content).toBe('<p>完整内容</p>');
    expect(parsed.items[0].author).toBe('作者甲');
  });

  it('normalizes pubDate to ISO', () => {
    expect(parsed.items[0].pubDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(parsed.items[1].pubDate).toBe('2024-06-03T10:00:00.000Z');
  });

  it('falls back to description when no content:encoded', () => {
    expect(parsed.items[1].content).toBe('普通描述');
  });

  it('falls back guid to link', () => {
    expect(parsed.items[1].guid).toBe('https://example.com/posts/2');
  });
});

describe('parseRss (Atom)', () => {
  const atom = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>原子频道</title>
  <link href="https://example.com/atom"/>
  <subtitle>原子简介</subtitle>
  <entry>
    <title>原子文章</title>
    <link href="https://example.com/a/1"/>
    <id>urn:uuid:abc</id>
    <content type="html">&lt;p&gt;原子内容&lt;/p&gt;</content>
    <updated>2024-06-05T12:00:00Z</updated>
  </entry>
</feed>`;

  const parsed = parseRss(atom);

  it('parses atom feed metadata', () => {
    expect(parsed.title).toBe('原子频道');
    expect(parsed.link).toBe('https://example.com/atom');
    expect(parsed.description).toBe('原子简介');
  });

  it('parses atom entries', () => {
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].title).toBe('原子文章');
    expect(parsed.items[0].link).toBe('https://example.com/a/1');
    expect(parsed.items[0].content).toBe('<p>原子内容</p>');
    expect(parsed.items[0].guid).toBe('urn:uuid:abc');
    expect(parsed.items[0].pubDate).toBe('2024-06-05T12:00:00.000Z');
  });
});

describe('toIsoDate', () => {
  it('normalizes RFC822 dates', () => {
    expect(toIsoDate('Tue, 04 Jun 2024 08:30:00 GMT')).toBe(
      new Date('Tue, 04 Jun 2024 08:30:00 GMT').toISOString()
    );
  });

  it('returns empty for invalid dates', () => {
    expect(toIsoDate('not a date')).toBe('');
    expect(toIsoDate('')).toBe('');
  });
});
