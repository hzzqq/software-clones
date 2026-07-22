export type ServiceStatus = 'up' | 'degraded' | 'down';

/** Map an HTTP status code (or null on network failure) to a service status. */
export function statusFromCode(code: number | null): ServiceStatus {
  if (code === null) return 'down';
  if (code >= 200 && code < 400) return 'up';
  if (code >= 400 && code < 500) return 'degraded';
  return 'down';
}

export interface CheckPoint {
  ok: number;
  checkedAt: string;
}

/** Uptime percentage over the supplied checks (0..100, one decimal). */
export function uptimePercent(checks: CheckPoint[]): number {
  if (checks.length === 0) return 100;
  const up = checks.filter((c) => c.ok).length;
  return Math.round((up / checks.length) * 1000) / 10;
}

/** Derive the overall status banner from individual service statuses. */
export function overallStatus(items: ServiceStatus[]): ServiceStatus {
  if (items.some((s) => s === 'down')) return 'down';
  if (items.some((s) => s === 'degraded')) return 'degraded';
  return 'up';
}
