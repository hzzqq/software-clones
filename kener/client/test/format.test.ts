import { describe, it, expect } from 'vitest';
import { serviceHealthLabel, incidentSeverityLabel } from '../src/utils/format';

describe('serviceHealthLabel', () => {
  it('100 应返回 优', () => {
    expect(serviceHealthLabel(100)).toBe('优');
  });

  it('99.9 应返回 优（边界）', () => {
    expect(serviceHealthLabel(99.9)).toBe('优');
  });

  it('99.5 应返回 良', () => {
    expect(serviceHealthLabel(99.5)).toBe('良');
  });

  it('96 应返回 中', () => {
    expect(serviceHealthLabel(96)).toBe('中');
  });

  it('95 应返回 中（边界）', () => {
    expect(serviceHealthLabel(95)).toBe('中');
  });

  it('90 应返回 差', () => {
    expect(serviceHealthLabel(90)).toBe('差');
  });

  it('不修改入参', () => {
    const input = 99.5;
    const copy = input;
    serviceHealthLabel(input);
    expect(input).toBe(copy);
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
