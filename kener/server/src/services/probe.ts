import { db } from '../db';

export interface ProbeResult {
  statusCode: number | null;
  ok: boolean;
  latencyMs: number | null;
}

const PROBE_TIMEOUT_MS = 8000;

/** Perform a single HTTP probe against the given URL. */
export async function probeService(url: string): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    const ok = res.status >= 200 && res.status < 400;
    return { statusCode: res.status, ok, latencyMs };
  } catch {
    const latencyMs = Date.now() - start;
    return { statusCode: null, ok: false, latencyMs };
  }
}

/** Persist a probe result into the `checks` table. */
export function recordCheck(serviceId: number, result: ProbeResult): void {
  const checkedAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO checks (service_id, status_code, ok, latency_ms, checked_at) VALUES (?, ?, ?, ?, ?)',
  ).run(serviceId, result.statusCode, result.ok ? 1 : 0, result.latencyMs, checkedAt);
  // Keep the checks table bounded: drop entries older than 120 days.
  db.prepare("DELETE FROM checks WHERE checked_at < datetime('now', '-120 days')").run();
}

/** Probe a service and persist the result in one step. */
export async function probeAndRecord(serviceId: number, url: string): Promise<ProbeResult> {
  const result = await probeService(url);
  recordCheck(serviceId, result);
  return result;
}
