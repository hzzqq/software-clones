import { describe, it, expect } from 'vitest';
import {
  extractTemplateVars,
  interpolateTemplate,
  missingTemplateVars,
  interpolateRecord,
  interpolateTarget,
  missingVarsOf,
  parseVariablesText,
  variablesToText,
  type TemplateTarget,
} from './template';

describe('extractTemplateVars', () => {
  it('提取变量名并去重、保持首次出现顺序', () => {
    expect(extractTemplateVars('{{host}}/{{ver}}/{{host}}')).toEqual(['host', 'ver']);
  });

  it('允许占位符内两侧空白', () => {
    expect(extractTemplateVars('{{  base_url  }}')).toEqual(['base_url']);
  });

  it('支持点号与连字符命名', () => {
    expect(extractTemplateVars('{{api.v2}}/{{x-token}}')).toEqual(['api.v2', 'x-token']);
  });

  it('空文本返回空数组', () => {
    expect(extractTemplateVars('')).toEqual([]);
  });

  it('不匹配非法命名（含空格 / 特殊字符）', () => {
    expect(extractTemplateVars('{{a b}} {{c$}}')).toEqual([]);
  });

  it('多次调用互不干扰（无 lastIndex 残留）', () => {
    const text = '{{a}}{{b}}';
    expect(extractTemplateVars(text)).toEqual(['a', 'b']);
    expect(extractTemplateVars(text)).toEqual(['a', 'b']);
  });
});

describe('interpolateTemplate', () => {
  it('替换已定义变量', () => {
    expect(interpolateTemplate('{{host}}/users', { host: 'https://a.com' })).toBe(
      'https://a.com/users',
    );
  });

  it('未定义变量原样保留', () => {
    expect(interpolateTemplate('{{host}}/{{miss}}', { host: 'h' })).toBe('h/{{miss}}');
  });

  it('空字符串变量替换为空', () => {
    expect(interpolateTemplate('a{{x}}b', { x: '' })).toBe('ab');
  });

  it('同一变量多处替换', () => {
    expect(interpolateTemplate('{{v}}-{{v}}', { v: '1' })).toBe('1-1');
  });

  it('无占位符时原样返回', () => {
    expect(interpolateTemplate('plain text', { a: '1' })).toBe('plain text');
  });

  it('空文本安全返回空串', () => {
    expect(interpolateTemplate('', { a: '1' })).toBe('');
  });

  it('缺省变量表时不抛错', () => {
    expect(interpolateTemplate('{{a}}')).toBe('{{a}}');
  });

  it('不修改入参对象', () => {
    const vars = { a: '1' };
    interpolateTemplate('{{a}}', vars);
    expect(vars).toEqual({ a: '1' });
  });
});

describe('missingTemplateVars', () => {
  it('只返回未定义的变量', () => {
    expect(missingTemplateVars('{{a}}{{b}}', { a: '1' })).toEqual(['b']);
  });

  it('全部已定义时返回空数组', () => {
    expect(missingTemplateVars('{{a}}', { a: '1' })).toEqual([]);
  });

  it('值为空串仍视为已定义', () => {
    expect(missingTemplateVars('{{a}}', { a: '' })).toEqual([]);
  });
});

describe('interpolateRecord', () => {
  it('键与值同时插值', () => {
    expect(interpolateRecord({ '{{k}}': '{{v}}' }, { k: 'Authorization', v: 'Bearer 1' })).toEqual({
      Authorization: 'Bearer 1',
    });
  });

  it('空对象返回空对象', () => {
    expect(interpolateRecord({}, { a: '1' })).toEqual({});
  });

  it('不修改入参', () => {
    const rec = { a: '{{x}}' };
    interpolateRecord(rec, { x: '1' });
    expect(rec).toEqual({ a: '{{x}}' });
  });
});

describe('interpolateTarget / missingVarsOf', () => {
  const target: TemplateTarget = {
    url: '{{base}}/users/{{uid}}',
    params: { page: '{{page}}' },
    headers: { Authorization: 'Bearer {{token}}' },
    body: '{"id":"{{uid}}"}',
  };

  it('对四个部位统一插值', () => {
    const out = interpolateTarget(target, {
      base: 'https://api.test',
      uid: '7',
      page: '2',
      token: 'abc',
    });
    expect(out.url).toBe('https://api.test/users/7');
    expect(out.params).toEqual({ page: '2' });
    expect(out.headers).toEqual({ Authorization: 'Bearer abc' });
    expect(out.body).toBe('{"id":"7"}');
  });

  it('缺失变量按 url→params→headers→body 顺序去重汇总', () => {
    expect(missingVarsOf(target, { base: 'x' })).toEqual(['uid', 'page', 'token']);
  });

  it('变量齐全时无缺失', () => {
    expect(
      missingVarsOf(target, { base: 'b', uid: '1', page: '1', token: 't' }),
    ).toEqual([]);
  });

  it('不修改入参目标对象', () => {
    interpolateTarget(target, { base: 'b' });
    expect(target.url).toBe('{{base}}/users/{{uid}}');
  });
});

describe('parseVariablesText / variablesToText', () => {
  it('解析 key=value 多行文本', () => {
    expect(parseVariablesText('a=1\nb=2')).toEqual({ a: '1', b: '2' });
  });

  it('忽略空行与 # 注释行', () => {
    expect(parseVariablesText('# note\n\na=1\n')).toEqual({ a: '1' });
  });

  it('只按第一个 = 分割，值中可再含 =', () => {
    expect(parseVariablesText('token=a=b=c')).toEqual({ token: 'a=b=c' });
  });

  it('兼容 CRLF', () => {
    expect(parseVariablesText('a=1\r\nb=2')).toEqual({ a: '1', b: '2' });
  });

  it('忽略无 = 或键为空的行', () => {
    expect(parseVariablesText('novalue\n=2\nc=3')).toEqual({ c: '3' });
  });

  it('重复键后者覆盖前者', () => {
    expect(parseVariablesText('a=1\na=2')).toEqual({ a: '2' });
  });

  it('序列化按键字典序输出', () => {
    expect(variablesToText({ b: '2', a: '1' })).toBe('a=1\nb=2');
  });

  it('空表序列化为空串', () => {
    expect(variablesToText({})).toBe('');
  });

  it('解析与序列化可往返', () => {
    const text = 'base=https://a.com\ntoken=xyz';
    expect(variablesToText(parseVariablesText(text))).toBe(text);
  });
});
