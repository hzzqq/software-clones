export type ServiceStatus = 'up' | 'degraded' | 'down';

/** Map an HTTP status code (or null on network failure) to a service status. */
export function statusFromCode(code: number | null): ServiceStatus {
  if (code === null) return 'down';
  if (code >= 200 && code < 400) return 'up';
  if (code >= 400 && code < 500) return 'degraded';
  return 'down';
}
