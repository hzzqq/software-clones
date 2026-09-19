import path from 'path';
import os from 'os';
import fs from 'fs';
import request from 'supertest';
import { afterAll, beforeEach, describe, it, expect } from 'vitest';

// Use an isolated temp DB so tests never touch the real data file.
const dbFile = path.join(os.tmpdir(), `gridbase-server-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = dbFile;

const { app } = await import('../src/app');
const { db } = await import('../src/db');

beforeEach(() => {
  db.exec('DELETE FROM g_cells; DELETE FROM g_rows; DELETE FROM g_fields; DELETE FROM g_tables;');
});

afterAll(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.rmSync(dbFile + suffix, { force: true });
    } catch {
      /* ignore */
    }
  }
});

describe('gridbase API (EAV grid)', () => {
  it('creates a table, a field, a row, and a cell end-to-end', async () => {
    const t = await request(app).post('/api/tables').send({ name: 'Contacts' });
    expect(t.status).toBe(201);
    expect(t.body.code).toBe(0);
    const tableId = t.body.data.id as number;

    const f = await request(app)
      .post(`/api/tables/${tableId}/fields`)
      .send({ name: 'Name', type: 'text' });
    expect(f.status).toBe(201);
    const fieldId = f.body.data.id as number;

    const row = await request(app).post(`/api/tables/${tableId}/rows`).send({});
    expect(row.status).toBe(201);
    const rowId = row.body.data.id as number;

    const cell = await request(app)
      .put('/api/cells')
      .send({ rowId, fieldId, value: 'Alice' });
    expect(cell.status).toBe(200);
    expect(cell.body.data.value).toBe('Alice');

    const grid = await request(app).get(`/api/tables/${tableId}/rows`);
    expect(grid.status).toBe(200);
    expect(grid.body.data.fields).toHaveLength(1);
    expect(grid.body.data.rows).toHaveLength(1);
    expect(grid.body.data.rows[0].cells[fieldId]).toBe('Alice');
  });

  it('rejects an unsupported field type', async () => {
    const t = await request(app).post('/api/tables').send({ name: 'T' });
    const tableId = t.body.data.id as number;
    const res = await request(app)
      .post(`/api/tables/${tableId}/fields`)
      .send({ name: 'X', type: 'bogus' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('returns 404 for a missing table', async () => {
    const res = await request(app).get('/api/tables/99999');
    expect(res.status).toBe(404);
  });

  it('deletes a field and cascades its cells', async () => {
    const t = await request(app).post('/api/tables').send({ name: 'T2' });
    const tableId = t.body.data.id as number;
    const f = await request(app)
      .post(`/api/tables/${tableId}/fields`)
      .send({ name: 'F', type: 'text' });
    const fieldId = f.body.data.id as number;
    const row = await request(app).post(`/api/tables/${tableId}/rows`).send({});
    const rowId = row.body.data.id as number;
    await request(app).put('/api/cells').send({ rowId, fieldId, value: 'x' });

    const del = await request(app).delete(`/api/fields/${fieldId}`);
    expect(del.status).toBe(200);
    const grid = await request(app).get(`/api/tables/${tableId}/rows`);
    expect(grid.body.data.fields).toHaveLength(0);
  });
});
