import { db } from '../db';
import { probeAndRecord } from './probe';

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Periodically probe every registered service and persist the results so the
 * uptime timeline stays fresh without manual interaction.
 */
export function startProbeScheduler(intervalMs: number = 5 * 60 * 1000): void {
  if (timer) return;
  timer = setInterval(async () => {
    const rows = db.prepare('SELECT id, url FROM services').all() as { id: number; url: string }[];
    for (const r of rows) {
      try {
        await probeAndRecord(r.id, r.url);
      } catch {
        // Best-effort: a single failing probe must not break the scheduler.
      }
    }
  }, intervalMs);
  // Do not keep the event loop alive solely for the scheduler.
  if (timer.unref) timer.unref();
}
