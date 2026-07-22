import { describe, it, expect } from 'vitest';
import { statusFromCode, uptimePercent, overallStatus } from './status';

describe('status utils', () => {
  it('maps http codes to statuses', () => {
    expect(statusFromCode(200)).toBe('up');
    expect(statusFromCode(302)).toBe('up');
    expect(statusFromCode(404)).toBe('degraded');
    expect(statusFromCode(500)).toBe('down');
    expect(statusFromCode(null)).toBe('down');
  });

  it('computes uptime percent', () => {
    expect(uptimePercent([])).toBe(100);
    expect(
      uptimePercent([
        { ok: 1, checkedAt: '' },
        { ok: 1, checkedAt: '' },
      ]),
    ).toBe(100);
    expect(
      uptimePercent([
        { ok: 1, checkedAt: '' },
        { ok: 0, checkedAt: '' },
      ]),
    ).toBe(50);
    expect(
      uptimePercent([
        { ok: 1, checkedAt: '' },
        { ok: 1, checkedAt: '' },
        { ok: 0, checkedAt: '' },
      ]),
    ).toBeCloseTo(66.7, 1);
  });

  it('computes overall status', () => {
    expect(overallStatus(['up', 'up'])).toBe('up');
    expect(overallStatus(['up', 'degraded'])).toBe('degraded');
    expect(overallStatus(['up', 'down'])).toBe('down');
  });

  it('handles boundary and edge-case codes', () => {
    expect(statusFromCode(0)).toBe('down');
    expect(statusFromCode(399)).toBe('up');
    expect(statusFromCode(400)).toBe('degraded');
    expect(statusFromCode(499)).toBe('degraded');
    expect(statusFromCode(599)).toBe('down');
  });

  it('reports 0% uptime when all checks failed', () => {
    expect(
      uptimePercent([
        { ok: 0, checkedAt: '' },
        { ok: 0, checkedAt: '' },
      ]),
    ).toBe(0);
  });

  it('treats an empty list as fully up', () => {
    expect(overallStatus([])).toBe('up');
  });
});
