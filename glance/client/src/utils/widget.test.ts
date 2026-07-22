import { describe, it, expect } from 'vitest';
import { safeParse, parseDto, normalizeLayout, DEFAULT_LAYOUT } from './widget';
import { WidgetDTO } from '../types';

describe('safeParse', () => {
  it('parses valid JSON', () => {
    expect(safeParse('{"a":1}', {})).toEqual({ a: 1 });
  });
  it('falls back on malformed JSON', () => {
    expect(safeParse('{bad', { a: 1 })).toEqual({ a: 1 });
  });
  it('falls back on empty string', () => {
    expect(safeParse('', [1, 2])).toEqual([1, 2]);
  });
});

describe('parseDto', () => {
  const base: WidgetDTO = {
    id: 1,
    type: 'clock',
    title: 'Clock',
    layoutJson: '{"x":1,"y":2,"w":3,"h":4}',
    configJson: '{"timezone":"UTC"}',
    enabled: 1,
    createdAt: '',
    updatedAt: '',
  };
  it('parses a well-formed DTO', () => {
    const w = parseDto(base);
    expect(w.layout).toEqual({ x: 1, y: 2, w: 3, h: 4 });
    expect(w.config).toEqual({ timezone: 'UTC' });
    expect(w.enabled).toBe(true);
  });
  it('recovers from malformed layout/config JSON', () => {
    const w = parseDto({ ...base, layoutJson: '{bad', configJson: '!!!' });
    expect(w.layout).toEqual(DEFAULT_LAYOUT);
    expect(w.config).toEqual({});
  });
  it('treats enabled=0 as false', () => {
    expect(parseDto({ ...base, enabled: 0 }).enabled).toBe(false);
  });
});

describe('normalizeLayout', () => {
  it('clamps out-of-range values', () => {
    expect(normalizeLayout({ x: -5, w: 999, h: 0 })).toEqual({
      x: 0,
      y: 0,
      w: 12,
      h: 2,
    });
  });
  it('passes through valid values', () => {
    expect(normalizeLayout({ x: 2, y: 3, w: 4, h: 5 })).toEqual({
      x: 2,
      y: 3,
      w: 4,
      h: 5,
    });
  });
  it('defaults when undefined', () => {
    expect(normalizeLayout(undefined)).toEqual(DEFAULT_LAYOUT);
  });
});
