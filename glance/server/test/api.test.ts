import path from 'path';
import os from 'os';
import fs from 'fs';
import request from 'supertest';
import { afterAll, beforeEach, describe, it, expect } from 'vitest';
import { weatherCodeToText } from '../src/services/weatherProxy';

// Isolated temp DB.
const dbFile = path.join(os.tmpdir(), `glance-server-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = dbFile;

const { app } = await import('../src/app');
const { db } = await import('../src/db');

afterAll(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.rmSync(dbFile + suffix, { force: true });
    } catch {
      /* ignore */
    }
  }
});

beforeEach(() => {
  db.exec('DELETE FROM widget;');
});

async function createWidget(type = 'rss', title = 'Feed') {
  const res = await request(app)
    .post('/api/widgets')
    .send({ type, title, configJson: JSON.stringify({ url: 'https://example.com/rss' }) });
  return res.body.data;
}

describe('widgets CRUD', () => {
  it('creates a widget with default layout/config', async () => {
    const res = await request(app)
      .post('/api/widgets')
      .send({ type: 'rss', title: 'My Feed' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.type).toBe('rss');
    expect(res.body.data.layoutJson).toBe('{"x":0,"y":0,"w":4,"h":4}');
    expect(res.body.data.configJson).toBe('{}');
    expect(res.body.data.enabled).toBe(1);
  });

  it('rejects widget creation without type', async () => {
    const res = await request(app).post('/api/widgets').send({ title: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('rejects widget creation without title', async () => {
    const res = await request(app).post('/api/widgets').send({ type: 'rss' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('lists widgets', async () => {
    await createWidget('rss', 'A');
    await createWidget('weather', 'B');
    const res = await request(app).get('/api/widgets');
    expect(res.body.data.length).toBe(2);
  });

  it('returns a single widget', async () => {
    const w = await createWidget('clock', 'Clock');
    const res = await request(app).get(`/api/widgets/${w.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(w.id);
  });

  it('returns 404 for a missing widget', async () => {
    const res = await request(app).get('/api/widgets/99999');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40400);
  });

  it('updates a widget', async () => {
    const w = await createWidget('status', 'S');
    const res = await request(app)
      .patch(`/api/widgets/${w.id}`)
      .send({ title: 'Renamed', enabled: 0 });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Renamed');
    expect(res.body.data.enabled).toBe(0);
  });

  it('deletes a widget', async () => {
    const w = await createWidget('bookmarks', 'B');
    const del = await request(app).delete(`/api/widgets/${w.id}`);
    expect(del.status).toBe(200);
    const get = await request(app).get(`/api/widgets/${w.id}`);
    expect(get.status).toBe(404);
  });
});

describe('config YAML import/export', () => {
  it('exports widgets as YAML', async () => {
    await createWidget('rss', 'Exported Feed');
    const res = await request(app).get('/api/config/export');
    expect(res.status).toBe(200);
    expect(String(res.headers['content-type'])).toContain('text/yaml');
    expect(res.text).toContain('widgets:');
    expect(res.text).toContain('Exported Feed');
  });

  it('imports widgets from YAML (replacing existing)', async () => {
    await createWidget('rss', 'old');
    const yamlText = [
      'version: 1',
      'widgets:',
      '  - type: rss',
      '    title: Imported Feed',
      '    enabled: true',
      '    config:',
      '      url: https://example.com/rss',
      '  - type: weather',
      '    title: Imported Weather',
      '    config:',
      '      lat: 52.52',
      '      lon: 13.41',
    ].join('\n');

    const res = await request(app).post('/api/config/import').send({ yaml: yamlText });
    expect(res.status).toBe(201);
    expect(res.body.data.imported).toBe(2);

    const widgets = await request(app).get('/api/widgets');
    expect(widgets.body.data.length).toBe(2);
    expect(widgets.body.data.some((w: any) => w.type === 'weather')).toBe(true);
  });

  it('rejects import without yaml body', async () => {
    const res = await request(app).post('/api/config/import').send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('rejects malformed YAML', async () => {
    const res = await request(app).post('/api/config/import').send({ yaml: '::: not yaml : :' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });
});

describe('proxy routes', () => {
  it('probes a status URL and returns a StatusResult shape', async () => {
    const res = await request(app).get('/api/proxy/status?url=http://127.0.0.1:9');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    const data = res.body.data;
    expect(typeof data.url).toBe('string');
    expect(typeof data.status).toBe('number');
    expect(typeof data.ok).toBe('boolean');
    expect(typeof data.latencyMs).toBe('number');
  });

  it('returns 40001 for /proxy/status without url', async () => {
    const res = await request(app).get('/api/proxy/status');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('returns 50200 for an unreachable RSS feed', async () => {
    const res = await request(app).get('/api/proxy/rss?url=http://127.0.0.1:1/feed.xml');
    expect(res.status).toBe(502);
    expect(res.body.code).toBe(50200);
  });

  it('returns 40001 for /proxy/rss without url', async () => {
    const res = await request(app).get('/api/proxy/rss');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('returns 40001 for /proxy/weather without lat/lon', async () => {
    const res = await request(app).get('/api/proxy/weather');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('weather proxy: returns shape on success or 50200 when offline', async () => {
    const res = await request(app).get('/api/proxy/weather?lat=52.52&lon=13.41');
    if (res.body.code === 0) {
      expect(res.body.data).toHaveProperty('temperature');
      expect(res.body.data).toHaveProperty('weatherCode');
      expect(res.body.data).toHaveProperty('windSpeed');
      expect(res.body.data).toHaveProperty('time');
    } else {
      expect(res.body.code).toBe(50200);
    }
  });
});

describe('weatherCodeToText (pure helper)', () => {
  it('maps known codes to labels', () => {
    expect(weatherCodeToText(0)).toBe('晴');
    expect(weatherCodeToText(61)).toBe('小雨');
    expect(weatherCodeToText(95)).toBe('雷阵雨');
  });

  it('falls back to a generic label for unknown codes', () => {
    expect(weatherCodeToText(123)).toBe('代码 123');
  });
});
