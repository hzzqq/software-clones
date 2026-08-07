import path from 'path';
import os from 'os';
import fs from 'fs';
import request from 'supertest';
import { afterAll, beforeEach, describe, it, expect } from 'vitest';

// Use an isolated temp DB so tests never touch the real data file.
const dbFile = path.join(os.tmpdir(), `kanban-server-test-${process.pid}-${Date.now()}.db`);
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
  db.exec(
    'DELETE FROM card_activity; DELETE FROM checklist_item; DELETE FROM card_tag; DELETE FROM card; DELETE FROM tag; DELETE FROM list; DELETE FROM board;'
  );
});

// Small helpers ---------------------------------------------------------------
async function createBoard(name = 'Board A') {
  const res = await request(app).post('/api/boards').send({ name });
  return res.body.data;
}
async function createList(boardId: number, title: string, position: number) {
  const res = await request(app).post('/api/lists').send({ boardId, title, position });
  return res.body.data;
}
async function createCard(listId: number, title: string, position: number) {
  const res = await request(app).post('/api/cards').send({ listId, title, position });
  return res.body.data;
}
async function createTag(boardId: number, name = 'urgent', color = '#ef4444') {
  const res = await request(app).post('/api/tags').send({ boardId, name, color });
  return res.body.data;
}

describe('boards CRUD', () => {
  it('creates a board', async () => {
    const res = await request(app).post('/api/boards').send({ name: 'My Board' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBeGreaterThan(0);
    expect(res.body.data.name).toBe('My Board');
    expect(res.body.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('rejects board creation without a name', async () => {
    const res = await request(app).post('/api/boards').send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('returns a board detail with empty lists/cards/tags', async () => {
    const board = await createBoard();
    const res = await request(app).get(`/api/boards/${board.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(board.id);
    expect(res.body.data.lists).toEqual([]);
    expect(res.body.data.cards).toEqual([]);
    expect(res.body.data.tags).toEqual([]);
  });

  it('returns 404 for a missing board', async () => {
    const res = await request(app).get('/api/boards/99999');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40400);
  });

  it('renames a board', async () => {
    const board = await createBoard();
    const res = await request(app).patch(`/api/boards/${board.id}`).send({ name: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed');
  });

  it('lists all boards', async () => {
    await createBoard('B1');
    await createBoard('B2');
    const res = await request(app).get('/api/boards');
    expect(res.body.data.length).toBe(2);
  });
});

describe('lists CRUD', () => {
  it('creates a list under a board', async () => {
    const board = await createBoard();
    const res = await request(app)
      .post('/api/lists')
      .send({ boardId: board.id, title: 'Todo', position: 0 });
    expect(res.status).toBe(201);
    expect(res.body.data.boardId).toBe(board.id);
    expect(res.body.data.position).toBe(0);
  });

  it('rejects list creation without boardId', async () => {
    const res = await request(app).post('/api/lists').send({ title: 'Todo' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('updates list position and title', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'Todo', 0);
    const res = await request(app)
      .patch(`/api/lists/${list.id}`)
      .send({ title: 'Doing', position: 3 });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Doing');
    expect(res.body.data.position).toBe(3);
  });

  it('returns 404 when patching a missing list', async () => {
    const res = await request(app).patch('/api/lists/99999').send({ title: 'x' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40400);
  });
});

describe('cards CRUD', () => {
  it('creates a card', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'Todo', 0);
    const res = await request(app)
      .post('/api/cards')
      .send({ listId: list.id, title: 'Write tests', position: 0 });
    expect(res.status).toBe(201);
    expect(res.body.data.listId).toBe(list.id);
    expect(res.body.data.title).toBe('Write tests');
    expect(res.body.data.tagIds).toEqual([]);
  });

  it('rejects card creation without title', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'Todo', 0);
    const res = await request(app).post('/api/cards').send({ listId: list.id });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('lists cards in a list sorted by position', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'Todo', 0);
    await createCard(list.id, 'C2', 1);
    await createCard(list.id, 'C1', 0);
    const res = await request(app).get(`/api/lists/${list.id}/cards`);
    expect(res.body.data.map((c: any) => c.title)).toEqual(['C1', 'C2']);
  });

  it('returns 404 for a missing card', async () => {
    const res = await request(app).get('/api/cards/99999');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40400);
  });

  it('persists a drag move (PATCH listId + position)', async () => {
    const board = await createBoard();
    const listA = await createList(board.id, 'A', 0);
    const listB = await createList(board.id, 'B', 1);
    const c1 = await createCard(listA.id, 'C1', 0);
    await createCard(listA.id, 'C2', 1);
    // 不要硬编码自增 id：DELETE FROM 不会重置 sqlite_sequence，跨用例 id 会持续增长。
    const c3 = await createCard(listB.id, 'C3', 0);

    const patchRes = await request(app)
      .patch(`/api/cards/${c1.id}`)
      .send({ listId: listB.id, position: 0 });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.listId).toBe(listB.id);
    expect(patchRes.body.data.position).toBe(0);

    const listBRes = await request(app).get(`/api/lists/${listB.id}/cards`);
    expect(listBRes.body.data.map((c: any) => c.id)).toEqual([c1.id, c3.id]);
  });

  it('rejects PATCH with no updatable fields', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C', 0);
    const res = await request(app).patch(`/api/cards/${card.id}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('deletes a card', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C', 0);
    const del = await request(app).delete(`/api/cards/${card.id}`);
    expect(del.status).toBe(200);
    const get = await request(app).get(`/api/cards/${card.id}`);
    expect(get.status).toBe(404);
  });

  it('keeps other fields intact when patching only one field', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const create = await request(app).post('/api/cards').send({
      listId: list.id,
      title: 'C',
      position: 0,
      description: 'keep me',
      dueDate: '2024-06-01',
      priority: 2,
    });
    const card = create.body.data;

    const res = await request(app).patch(`/api/cards/${card.id}`).send({ completed: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('keep me');
    expect(res.body.data.dueDate).toBe('2024-06-01');
    expect(res.body.data.priority).toBe(2);
    expect(res.body.data.listId).toBe(list.id);
    expect(res.body.data.completed).toBe(1);
  });
});

describe('card assignee', () => {
  it('defaults assignee to an empty string', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C', 0);
    expect(card.assignee).toBe('');
  });

  it('creates and patches the assignee', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const create = await request(app)
      .post('/api/cards')
      .send({ listId: list.id, title: 'C', position: 0, assignee: '  Alice  ' });
    expect(create.body.data.assignee).toBe('Alice');

    const patch = await request(app)
      .patch(`/api/cards/${create.body.data.id}`)
      .send({ assignee: 'Bob' });
    expect(patch.status).toBe(200);
    expect(patch.body.data.assignee).toBe('Bob');

    const cleared = await request(app)
      .patch(`/api/cards/${create.body.data.id}`)
      .send({ assignee: '' });
    expect(cleared.body.data.assignee).toBe('');
  });
});

describe('card checklist', () => {
  it('adds, toggles and removes checklist items', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C', 0);

    const a = await request(app).post(`/api/cards/${card.id}/checklist`).send({ text: ' step 1 ' });
    expect(a.status).toBe(201);
    expect(a.body.data.text).toBe('step 1');
    expect(a.body.data.done).toBe(0);
    expect(a.body.data.position).toBe(0);

    const b = await request(app).post(`/api/cards/${card.id}/checklist`).send({ text: 'step 2' });
    expect(b.body.data.position).toBe(1);

    const listRes = await request(app).get(`/api/cards/${card.id}/checklist`);
    expect(listRes.body.data.map((i: any) => i.text)).toEqual(['step 1', 'step 2']);

    const toggled = await request(app).patch(`/api/checklist/${a.body.data.id}`).send({ done: 1 });
    expect(toggled.status).toBe(200);
    expect(toggled.body.data.done).toBe(1);

    const del = await request(app).delete(`/api/checklist/${b.body.data.id}`);
    expect(del.status).toBe(200);
    const after = await request(app).get(`/api/cards/${card.id}/checklist`);
    expect(after.body.data).toHaveLength(1);
  });

  it('exposes the checklist on the card and board detail payloads', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C', 0);
    await request(app).post(`/api/cards/${card.id}/checklist`).send({ text: 'sub' });

    const single = await request(app).get(`/api/cards/${card.id}`);
    expect(single.body.data.checklist).toHaveLength(1);
    expect(single.body.data.checklist[0].text).toBe('sub');

    const detail = await request(app).get(`/api/boards/${board.id}`);
    expect(detail.body.data.cards[0].checklist).toHaveLength(1);
  });

  it('validates checklist input and missing resources', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C', 0);

    const empty = await request(app).post(`/api/cards/${card.id}/checklist`).send({ text: '  ' });
    expect(empty.status).toBe(400);
    expect(empty.body.code).toBe(40001);

    const missingCard = await request(app).post('/api/cards/99999/checklist').send({ text: 'x' });
    expect(missingCard.status).toBe(404);

    const missingItem = await request(app).patch('/api/checklist/99999').send({ done: 1 });
    expect(missingItem.status).toBe(404);

    const noop = await request(app).patch('/api/checklist/1').send({});
    expect(noop.status).toBe(400);
  });
});

describe('list wip limit', () => {
  it('defaults to 0 and can be updated', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    expect(list.wipLimit).toBe(0);

    const res = await request(app).patch(`/api/lists/${list.id}`).send({ wipLimit: 3 });
    expect(res.status).toBe(200);
    expect(res.body.data.wipLimit).toBe(3);

    const detail = await request(app).get(`/api/boards/${board.id}`);
    expect(detail.body.data.lists[0].wipLimit).toBe(3);
  });
});

describe('tags CRUD', () => {
  it('creates a tag', async () => {
    const board = await createBoard();
    const res = await request(app)
      .post('/api/tags')
      .send({ boardId: board.id, name: 'urgent', color: '#ef4444' });
    expect(res.status).toBe(201);
    expect(res.body.data.boardId).toBe(board.id);
    expect(res.body.data.color).toBe('#ef4444');
  });

  it('assigns and removes a tag on a card', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C', 0);
    const tag = await createTag(board.id);

    const add = await request(app)
      .post(`/api/cards/${card.id}/tags`)
      .send({ tagId: tag.id });
    expect(add.status).toBe(201);

    const detail = await request(app).get(`/api/boards/${board.id}`);
    expect(detail.body.data.cards[0].tagIds).toContain(tag.id);

    const remove = await request(app).delete(`/api/cards/${card.id}/tags/${tag.id}`);
    expect(remove.status).toBe(200);
    const detail2 = await request(app).get(`/api/boards/${board.id}`);
    expect(detail2.body.data.cards[0].tagIds).not.toContain(tag.id);
  });

  it('rejects tag assignment with invalid tagId', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C', 0);
    const res = await request(app)
      .post(`/api/cards/${card.id}/tags`)
      .send({ tagId: 'not-a-number' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });
});

describe('cascade deletes', () => {
  it('deleting a board removes its lists, cards and tags', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C', 0);
    const tag = await createTag(board.id);
    await request(app).post(`/api/cards/${card.id}/tags`).send({ tagId: tag.id });

    const del = await request(app).delete(`/api/boards/${board.id}`);
    expect(del.status).toBe(200);

    expect((await request(app).get(`/api/boards/${board.id}`)).status).toBe(404);
    // cards and tags are cascade-deleted with the board
    expect((await request(app).get(`/api/cards/${card.id}`)).status).toBe(404);
    expect((await request(app).get(`/api/tags/${tag.id}`)).status).toBe(404);
  });

  it('deleting a list removes its cards', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    await createCard(list.id, 'C1', 0);
    await createCard(list.id, 'C2', 1);

    await request(app).delete(`/api/lists/${list.id}`);

    const detail = await request(app).get(`/api/boards/${board.id}`);
    expect(detail.body.data.cards.length).toBe(0);
  });

  it('deleting a tag removes its card assignments', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C', 0);
    const tag = await createTag(board.id);
    await request(app).post(`/api/cards/${card.id}/tags`).send({ tagId: tag.id });

    await request(app).delete(`/api/tags/${tag.id}`);

    const detail = await request(app).get(`/api/boards/${board.id}`);
    expect(detail.body.data.cards[0].tagIds).not.toContain(tag.id);
  });
});
