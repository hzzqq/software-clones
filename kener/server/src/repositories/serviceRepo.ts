import { db } from '../db';

export interface ServiceRow {
  id: number;
  name: string;
  url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  name: string;
  url: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckRow {
  ok: number;
  status_code: number | null;
  latency_ms: number | null;
  checked_at: string;
}

function rowToService(r: ServiceRow): Service {
  return {
    id: r.id,
    name: r.name,
    url: r.url,
    description: r.description,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listServices(): Service[] {
  return (
    db.prepare('SELECT * FROM services ORDER BY created_at DESC').all() as ServiceRow[]
  ).map(rowToService);
}

export function getService(id: number): Service | null {
  const r = db.prepare('SELECT * FROM services WHERE id = ?').get(id) as ServiceRow | undefined;
  return r ? rowToService(r) : null;
}

export function createService(input: {
  name: string;
  url: string;
  description?: string;
}): Service {
  const now = new Date().toISOString();
  const info = db
    .prepare('INSERT INTO services (name, url, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(input.name, input.url, input.description ?? null, now, now);
  return getService(Number(info.lastInsertRowid))!;
}

export function updateService(
  id: number,
  input: { name?: string; url?: string; description?: string },
): Service | null {
  const existing = getService(id);
  if (!existing) return null;
  const name = input.name ?? existing.name;
  const url = input.url ?? existing.url;
  const description = input.description !== undefined ? input.description : existing.description;
  const now = new Date().toISOString();
  db.prepare('UPDATE services SET name = ?, url = ?, description = ?, updated_at = ? WHERE id = ?').run(
    name,
    url,
    description,
    now,
    id,
  );
  return getService(id);
}

export function deleteService(id: number): void {
  db.prepare('DELETE FROM services WHERE id = ?').run(id);
}

export function lastCheck(
  serviceId: number,
): { ok: number; statusCode: number | null; latencyMs: number | null; checkedAt: string } | null {
  const r = db
    .prepare(
      'SELECT ok, status_code, latency_ms, checked_at FROM checks WHERE service_id = ? ORDER BY checked_at DESC LIMIT 1',
    )
    .get(serviceId) as CheckRow | undefined;
  if (!r) return null;
  return { ok: r.ok, statusCode: r.status_code, latencyMs: r.latency_ms, checkedAt: r.checked_at };
}

export function recentChecks(
  serviceId: number,
  days = 90,
): { ok: number; checkedAt: string }[] {
  return db
    .prepare(
      "SELECT ok, checked_at FROM checks WHERE service_id = ? AND checked_at >= datetime('now', ?) ORDER BY checked_at ASC",
    )
    .all(serviceId, `-${days} days`) as { ok: number; checkedAt: string }[];
}
