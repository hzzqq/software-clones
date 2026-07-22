import db from '../db';
import type { SavedRequest, CreateRequestInput, UpdateRequestInput, HttpMethod } from '../types';

interface RequestRow {
  id: number;
  name: string;
  method: string;
  url: string;
  headers: string;
  params: string;
  body: string;
  folder: string;
  created_at: string;
  updated_at: string;
}

function parseObj(s: string): Record<string, string> {
  try {
    return JSON.parse(s || '{}');
  } catch {
    return {};
  }
}

function rowToRequest(r: RequestRow): SavedRequest {
  return {
    id: r.id,
    name: r.name,
    method: r.method as HttpMethod,
    url: r.url,
    headers: parseObj(r.headers),
    params: parseObj(r.params),
    body: r.body,
    folder: r.folder,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listRequests(folder?: string): SavedRequest[] {
  const rows = folder
    ? (db.prepare(`SELECT * FROM requests WHERE folder = ? ORDER BY updated_at DESC`).all(folder) as RequestRow[])
    : (db.prepare(`SELECT * FROM requests ORDER BY updated_at DESC`).all() as RequestRow[]);
  return rows.map(rowToRequest);
}

export function getRequest(id: number): SavedRequest | null {
  const row = db.prepare(`SELECT * FROM requests WHERE id = ?`).get(id) as RequestRow | undefined;
  return row ? rowToRequest(row) : null;
}

export function createRequest(input: CreateRequestInput): SavedRequest {
  const info = db
    .prepare(`INSERT INTO requests (name, method, url, headers, params, body, folder) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(
      input.name?.trim() || '',
      input.method,
      input.url.trim(),
      JSON.stringify(input.headers ?? {}),
      JSON.stringify(input.params ?? {}),
      input.body ?? '',
      input.folder?.trim() ?? '',
    );
  return getRequest(Number(info.lastInsertRowid))!;
}

export function updateRequest(id: number, input: UpdateRequestInput): SavedRequest | null {
  const existing = getRequest(id);
  if (!existing) return null;
  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const method = input.method ?? existing.method;
  const url = input.url !== undefined ? input.url.trim() : existing.url;
  const headers = input.headers ?? existing.headers;
  const params = input.params ?? existing.params;
  const body = input.body !== undefined ? input.body : existing.body;
  const folder = input.folder !== undefined ? input.folder.trim() : existing.folder;
  db.prepare(
    `UPDATE requests SET name = ?, method = ?, url = ?, headers = ?, params = ?, body = ?, folder = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`,
  ).run(name, method, url, JSON.stringify(headers), JSON.stringify(params), body, folder, id);
  return getRequest(id);
}

export function deleteRequest(id: number): boolean {
  const info = db.prepare(`DELETE FROM requests WHERE id = ?`).run(id);
  return info.changes > 0;
}
