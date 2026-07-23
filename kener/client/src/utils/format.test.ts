import { describe, it, expect } from 'vitest';
import { formatDuration, incidentDurationSeconds, uptimePercentage } from './format';
import type { Incident } from '../types';

describe('formatDuration', () => {
  it('不足一分钟显示秒', () => {
    expect(formatDuration(0)).toBe('0秒');
    expect(formatDuration(45)).toBe('45秒');
  });
  it('整分钟不显示秒', () => {
    expect(formatDuration(60)).toBe('1分');
    expect(formatDuration(120)).toBe('2分');
  });
  it('分钟与秒混合', () => {
    expect(formatDuration(90)).toBe('1分30秒');
  });
  it('小时级', () => {
    expect(formatDuration(3600)).toBe('1小时');
    expect(formatDuration(3700)).toBe('1小时1分');
  });
  it('天级', () => {
    expect(formatDuration(86400)).toBe('1天');
    expect(formatDuration(90000)).toBe('1天1小时');
  });
  it('负数按 0 处理', () => {
    expect(formatDuration(-5)).toBe('0秒');
  });
});

describe('incidentDurationSeconds', () => {
  const base: Incident = {
    id: 1,
    serviceId: null,
    title: 'x',
    description: null,
    status: 'open',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    resolvedAt: null,
  };
  it('未解决：以 nowMs 为终点', () => {
    const now = new Date('2026-01-01T01:00:00Z').getTime();
    expect(incidentDurationSeconds(base, now)).toBe(3600);
  });
  it('已解决：以 resolvedAt 为终点', () => {
    const now = new Date('2026-01-01T10:00:00Z').getTime();
    expect(incidentDurationSeconds({ ...base, resolvedAt: '2026-01-01T00:30:00Z' }, now)).toBe(1800);
  });
  it('终点早于起点时夹为 0', () => {
    const now = new Date('2025-12-31T23:00:00Z').getTime();
    expect(incidentDurationSeconds(base, now)).toBe(0);
  });
});

describe('uptimePercentage', () => {
  it('全 up 为 100', () => {
    expect(uptimePercentage([{ lastStatus: 'up' }, { lastStatus: 'up' }])).toBe(100);
  });
  it('degraded 计 50、down/未知计 0', () => {
    // up=100, degraded=50, down=0 -> 平均 50
    expect(uptimePercentage([{ lastStatus: 'up' }, { lastStatus: 'degraded' }, { lastStatus: 'down' }])).toBe(50);
    expect(uptimePercentage([{ lastStatus: 'degraded' }])).toBe(50);
    expect(uptimePercentage([{ lastStatus: 'down' }])).toBe(0);
  });
  it('未知状态计 0', () => {
    expect(uptimePercentage([{ lastStatus: undefined }, { lastStatus: 'up' }])).toBe(50);
  });
  it('空列表返回 0', () => {
    expect(uptimePercentage([])).toBe(0);
  });
});
