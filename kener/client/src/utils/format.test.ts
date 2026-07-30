import { describe, it, expect } from 'vitest';
import { formatDuration, incidentDurationSeconds, uptimePercentage, countByStatus, incidentSeverityLabel, incidentSeverityColor, uptimeColor, summarizeIncidents, formatIncidentWindow, formatUptime, meanResolveSeconds, incidentStatusLabel } from './format';
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
    severity: 'medium',
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
  it('非法 createdAt 返回 0（不再产生 NaN 时长）', () => {
    const now = new Date('2026-01-01T10:00:00Z').getTime();
    expect(incidentDurationSeconds({ ...base, createdAt: 'not-a-date' }, now)).toBe(0);
  });
  it('非法 resolvedAt 按进行中处理（用 nowMs 为终点，不再产生 NaN天NaN小时）', () => {
    const now = new Date('2026-01-01T10:00:00Z').getTime();
    expect(incidentDurationSeconds({ ...base, resolvedAt: 'bad' }, now)).toBe(36000);
  });
});

describe('uptimeColor', () => {
  it('≥99 为 success', () => {
    expect(uptimeColor(100)).toBe('success');
    expect(uptimeColor(99)).toBe('success');
  });
  it('90–99 为 warning', () => {
    expect(uptimeColor(95)).toBe('warning');
    expect(uptimeColor(90)).toBe('warning');
  });
  it('低于 90 为 error', () => {
    expect(uptimeColor(89)).toBe('error');
    expect(uptimeColor(0)).toBe('error');
  });
  it('非法值按 error 处理', () => {
    expect(uptimeColor(Number.NaN)).toBe('error');
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

describe('countByStatus', () => {
  it('按状态分别计数', () => {
    expect(
      countByStatus([{ lastStatus: 'up' }, { lastStatus: 'degraded' }, { lastStatus: 'down' }])
    ).toEqual({ up: 1, degraded: 1, down: 1 });
  });
  it('未知状态计入 down', () => {
    expect(countByStatus([{ lastStatus: undefined }, { lastStatus: 'up' }])).toEqual({
      up: 1,
      degraded: 0,
      down: 1,
    });
  });
  it('空列表返回全 0', () => {
    expect(countByStatus([])).toEqual({ up: 0, degraded: 0, down: 0 });
  });
  it('不修改入参', () => {
    const items = [{ lastStatus: 'up' as const }];
    const before = JSON.stringify(items);
    countByStatus(items);
    expect(JSON.stringify(items)).toBe(before);
  });
});

describe('summarizeIncidents', () => {
  const incidents = [
    { id: 1, title: 'a', severity: 'high', status: 'open', resolvedAt: null },
    { id: 2, title: 'b', severity: 'low', status: 'open', resolvedAt: null },
    { id: 3, title: 'c', severity: 'medium', status: 'resolved', resolvedAt: '2026-01-01' },
  ] as any[];
  it('统计进行中 / 已解决 / 总数', () => {
    expect(summarizeIncidents(incidents)).toEqual({ open: 2, resolved: 1, total: 3 });
  });
  it('resolvedAt 为 undefined 视为进行中', () => {
    const list = [{ id: 1, resolvedAt: undefined }] as any[];
    expect(summarizeIncidents(list)).toEqual({ open: 1, resolved: 0, total: 1 });
  });
  it('空列表返回全 0', () => {
    expect(summarizeIncidents([])).toEqual({ open: 0, resolved: 0, total: 0 });
  });
  it('不修改入参', () => {
    const before = incidents.map((i) => i.id);
    summarizeIncidents(incidents);
    expect(incidents.map((i) => i.id)).toEqual(before);
  });
});

describe('incidentSeverityLabel', () => {
  it('high → 高', () => {
    expect(incidentSeverityLabel('high')).toBe('高');
  });
  it('medium → 中', () => {
    expect(incidentSeverityLabel('medium')).toBe('中');
  });
  it('low → 低', () => {
    expect(incidentSeverityLabel('low')).toBe('低');
  });
  it('未知值原样透传', () => {
    expect(incidentSeverityLabel('critical')).toBe('critical');
    expect(incidentSeverityLabel('')).toBe('');
  });
});

describe('incidentSeverityColor', () => {
  it('high → error', () => {
    expect(incidentSeverityColor('high')).toBe('error');
  });
  it('medium → warning', () => {
    expect(incidentSeverityColor('medium')).toBe('warning');
  });
  it('low 与未知 → default', () => {
    expect(incidentSeverityColor('low')).toBe('default');
    expect(incidentSeverityColor('critical')).toBe('default');
    expect(incidentSeverityColor('')).toBe('default');
  });
});

describe('formatIncidentWindow', () => {
  const base: Incident = {
    id: 1,
    serviceId: null,
    title: 'x',
    description: null,
    status: 'open',
    severity: 'medium',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    resolvedAt: null,
  };
  it('未解决 → 进行中', () => {
    const now = new Date('2026-01-01T01:00:00Z').getTime();
    expect(formatIncidentWindow(base, now)).toBe('进行中');
  });
  it('已解决 → 持续 X', () => {
    const now = new Date('2026-01-01T01:00:00Z').getTime();
    expect(formatIncidentWindow({ ...base, resolvedAt: '2026-01-01T00:30:00Z' }, now)).toBe('持续 30分');
  });
  it('非法 createdAt → 时间未知', () => {
    const now = new Date('2026-01-01T10:00:00Z').getTime();
    expect(formatIncidentWindow({ ...base, createdAt: 'bad' }, now)).toBe('时间未知');
  });
});

describe('formatUptime', () => {
  it('保留 2 位小数', () => {
    expect(formatUptime(99.987)).toBe('99.99%');
    expect(formatUptime(100)).toBe('100.00%');
    expect(formatUptime(0)).toBe('0.00%');
  });
  it('越界夹回 [0,100]', () => {
    expect(formatUptime(123.4)).toBe('100.00%');
    expect(formatUptime(-5)).toBe('0.00%');
  });
  it('非法值回退 —', () => {
    expect(formatUptime(NaN)).toBe('—');
    expect(formatUptime(Infinity)).toBe('—');
  });
});

describe('meanResolveSeconds', () => {
  const mk = (resolvedAt: string | null): Incident => ({
    id: 1,
    serviceId: null,
    title: 'x',
    description: null,
    status: resolvedAt == null ? 'open' : 'resolved',
    severity: 'medium',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    resolvedAt,
  });
  const now = new Date('2026-01-01T10:00:00Z').getTime();
  it('空列表返回 NaN（无数据，不应显示 0）', () => {
    expect(Number.isNaN(meanResolveSeconds([], now))).toBe(true);
  });
  it('全部进行中返回 NaN（无法计算均值）', () => {
    expect(Number.isNaN(meanResolveSeconds([mk(null), mk(null)], now))).toBe(true);
  });
  it('单个已解决事件：resolvedAt - createdAt', () => {
    // 00:00 -> 00:30 = 1800s
    expect(meanResolveSeconds([mk('2026-01-01T00:30:00Z')], now)).toBe(1800);
  });
  it('多个已解决事件取均值', () => {
    const list = [
      mk('2026-01-01T00:30:00Z'), // 1800s
      mk('2026-01-01T01:00:00Z'), // 3600s
      mk('2026-01-01T02:00:00Z'), // 7200s
    ];
    expect(meanResolveSeconds(list, now)).toBe(4200);
  });
  it('混合列表仅统计已解决事件', () => {
    const list = [
      mk(null), // 进行中，忽略
      mk('2026-01-01T00:30:00Z'), // 1800s
      mk('2026-01-01T01:00:00Z'), // 3600s
    ];
    expect(meanResolveSeconds(list, now)).toBe(2700);
  });
  it('已解决事件含非法 createdAt 不产生 NaN 均值', () => {
    const list = [
      { ...mk('2026-01-01T01:00:00Z'), createdAt: 'bad' }, // 时长按 0 计
      mk('2026-01-01T00:30:00Z'), // 1800s
    ];
    expect(meanResolveSeconds(list, now)).toBe(900);
  });
  it('不修改入参', () => {
    const list = [mk('2026-01-01T01:00:00Z')];
    const before = JSON.stringify(list);
    meanResolveSeconds(list, now);
    expect(JSON.stringify(list)).toBe(before);
  });
});

describe('incidentStatusLabel', () => {
  const base: Incident = {
    id: 1, serviceId: null, title: 'x', description: null,
    status: 'open', severity: 'medium',
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    resolvedAt: null,
  } as Incident;
  it('进行中事件返回「进行中」', () => {
    expect(incidentStatusLabel(base)).toBe('进行中');
  });
  it('已解决事件返回「已解决」', () => {
    expect(incidentStatusLabel({ ...base, resolvedAt: '2026-01-02T00:00:00Z' })).toBe('已解决');
  });
  it('非对象/缺字段兜底「进行中」', () => {
    expect(incidentStatusLabel(null)).toBe('进行中');
    expect(incidentStatusLabel(undefined)).toBe('进行中');
    expect(incidentStatusLabel({} as Incident)).toBe('进行中');
  });
});
