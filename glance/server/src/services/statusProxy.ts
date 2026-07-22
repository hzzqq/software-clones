export interface StatusResult {
  url: string;
  status: number;
  ok: boolean;
  latencyMs: number;
}

const TIMEOUT_MS = 5000;

/**
 * Probes a URL from the server and reports the HTTP status plus latency.
 * Network failures are reported as `ok: false` with status 0 (not a 5xx).
 */
export async function checkStatus(url: string): Promise<StatusResult> {
  const start: number = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { method: 'GET', redirect: 'manual', signal: controller.signal });
    const latencyMs: number = Date.now() - start;
    return {
      url,
      status: res.status,
      ok: res.status >= 200 && res.status < 400,
      latencyMs,
    };
  } catch {
    const latencyMs: number = Date.now() - start;
    return { url, status: 0, ok: false, latencyMs };
  } finally {
    clearTimeout(timer);
  }
}
