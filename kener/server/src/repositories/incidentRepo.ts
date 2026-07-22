import { db } from '../db';

export interface IncidentRow {
  id: number;
  service_id: number | null;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface Incident {
  id: number;
  serviceId: number | null;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

function rowToIncident(r: IncidentRow): Incident {
  return {
    id: r.id,
    serviceId: r.service_id,
    title: r.title,
    description: r.description,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    resolvedAt: r.resolved_at,
  };
}

export function listIncidents(): Incident[] {
  return (
    db.prepare('SELECT * FROM incidents ORDER BY created_at DESC').all() as IncidentRow[]
  ).map(rowToIncident);
}

export function getIncident(id: number): Incident | null {
  const r = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as IncidentRow | undefined;
  return r ? rowToIncident(r) : null;
}

export function createIncident(input: {
  serviceId?: number | null;
  title: string;
  description?: string;
  status?: string;
}): Incident {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      'INSERT INTO incidents (service_id, title, description, status, created_at, updated_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(input.serviceId ?? null, input.title, input.description ?? null, input.status ?? 'investigating', now, now, null);
  return getIncident(Number(info.lastInsertRowid))!;
}

export function updateIncident(
  id: number,
  input: { title?: string; description?: string; status?: string },
): Incident | null {
  const ex = getIncident(id);
  if (!ex) return null;
  const title = input.title ?? ex.title;
  const description = input.description !== undefined ? input.description : ex.description;
  const status = input.status ?? ex.status;
  const now = new Date().toISOString();
  const resolvedAt =
    status === 'resolved' ? ex.resolvedAt ?? now : status !== 'resolved' && ex.resolvedAt ? ex.resolvedAt : null;
  db.prepare(
    'UPDATE incidents SET title = ?, description = ?, status = ?, updated_at = ?, resolved_at = ? WHERE id = ?',
  ).run(title, description, status, now, resolvedAt, id);
  return getIncident(id);
}

export function deleteIncident(id: number): void {
  db.prepare('DELETE FROM incidents WHERE id = ?').run(id);
}
