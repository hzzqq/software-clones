import path from 'path';
import os from 'os';
import fs from 'fs';
import request from 'supertest';
import { afterAll, beforeEach, describe, it, expect } from 'vitest';

// cycle 272：活动时间线 / 评论 / 列批量操作。
// 与 api.test.ts 用不同的临时库文件，避免并行 worker 互相踩数据。
const dbFile = path.join(os.tmpdir(), `kanban-activity-test-${process.pid}-${Date.now()}.db`);
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
interface IdName {
  id: number;
  [key: string]: unknown;
}

async function createBoard(name = 'Board A'): Promise<IdName> {
  const res = await request(app).post('/api/boards').send({ name });
  return res.body.data as IdName;
}

async function createList(boardId: number, title: string, position: number): Promise<IdName> {
  const res = await request(app).post('/api/lists').send({ boardId, title, position });
  return res.body.data as IdName;
}

async function createCard(listId: number, title: string, position: number): Promise<IdName> {
  const res = await request(app).post('/api/cards').send({ listId, title, position });
  return res.body.data as IdName;
}

interface ActivityItem {
  id: number;
  kind: string;
  detail: string;
  author: string;
}

/** 取某张卡片的活动时间线（按时间倒序）。 */
async function getActivity(cardId: number): Promise<ActivityItem[]> {
  const res = await request(app).get(`/api/cards/${cardId}/activity`);
  return res.body.data as ActivityItem[];
}

describe('card activity timeline', () => {
  it('logs a created event when a card is added', async () => {
    const board = await createBoard();
    const list = await createList(board.id, '待办', 0);
    const card = await createCard(list.id, 'C1', 0);

    const items = await getActivity(card.id);
    expect(items.length).toBe(1);
    expect(items[0].kind).toBe('created');
    expect(items[0].detail).toContain('待办');
  });

  it('logs a moved event when the card changes list', async () => {
    const board = await createBoard();
    const a = await createList(board.id, '待办', 0);
    const b = await createList(board.id, '进行中', 1);
    const card = await createCard(a.id, 'C1', 0);

    await request(app).patch(`/api/cards/${card.id}`).send({ listId: b.id, position: 0 });

    const moved = (await getActivity(card.id)).find((i) => i.kind === 'moved');
    expect(moved).toBeTruthy();
    expect(moved?.detail).toContain('待办');
    expect(moved?.detail).toContain('进行中');
  });

  it('does not log position-only reorders', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C1', 0);

    await request(app).patch(`/api/cards/${card.id}`).send({ position: 3 });
    await request(app).patch(`/api/cards/${card.id}`).send({ position: 5 });

    // 拖拽重排会批量 PATCH position，不应淹没时间线：只保留创建事件。
    const items = await getActivity(card.id);
    expect(items.length).toBe(1);
    expect(items[0].kind).toBe('created');
  });

  it('logs due date, priority, assignee, completion and rename changes', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C1', 0);

    await request(app).patch(`/api/cards/${card.id}`).send({ dueDate: '2030-01-02' });
    await request(app).patch(`/api/cards/${card.id}`).send({ priority: 3 });
    await request(app).patch(`/api/cards/${card.id}`).send({ assignee: '小王' });
    await request(app).patch(`/api/cards/${card.id}`).send({ completed: 1 });
    await request(app).patch(`/api/cards/${card.id}`).send({ title: 'C1 改' });

    const kinds = (await getActivity(card.id)).map((i) => i.kind);
    expect(kinds).toContain('due');
    expect(kinds).toContain('priority');
    expect(kinds).toContain('assignee');
    expect(kinds).toContain('completed');
    expect(kinds).toContain('renamed');
  });

  it('does not log when a patch sets an unchanged value', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C1', 0);

    await request(app).patch(`/api/cards/${card.id}`).send({ priority: 0 });
    await request(app).patch(`/api/cards/${card.id}`).send({ title: 'C1' });

    expect((await getActivity(card.id)).length).toBe(1);
  });

  it('honours the limit query parameter', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C1', 0);
    for (let i = 0; i < 5; i++) {
      await request(app).post(`/api/cards/${card.id}/comments`).send({ text: `c${i}` });
    }

    const res = await request(app).get(`/api/cards/${card.id}/activity?limit=3`);
    expect(res.body.data.length).toBe(3);
  });

  it('returns 404 for the activity of a missing card', async () => {
    const res = await request(app).get('/api/cards/999999/activity');
    expect(res.status).toBe(404);
  });

  it('cascade-deletes activity together with the card', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C1', 0);

    await request(app).delete(`/api/cards/${card.id}`);

    const row = db
      .prepare('SELECT COUNT(*) AS n FROM card_activity WHERE card_id = ?')
      .get(card.id) as { n: number };
    expect(row.n).toBe(0);
  });
});

describe('card comments', () => {
  it('creates a comment and exposes it in the timeline', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C1', 0);

    const res = await request(app)
      .post(`/api/cards/${card.id}/comments`)
      .send({ text: '  这个先别做  ', author: ' 小李 ' });
    expect(res.status).toBe(201);
    expect(res.body.data.kind).toBe('comment');
    expect(res.body.data.detail).toBe('这个先别做');
    expect(res.body.data.author).toBe('小李');

    const items = await getActivity(card.id);
    expect(items.some((i) => i.kind === 'comment' && i.detail === '这个先别做')).toBe(true);
  });

  it('rejects an empty comment', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C1', 0);

    const res = await request(app).post(`/api/cards/${card.id}/comments`).send({ text: '   ' });
    expect(res.status).toBe(400);
  });

  it('rejects an over-long comment', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C1', 0);

    const res = await request(app)
      .post(`/api/cards/${card.id}/comments`)
      .send({ text: 'x'.repeat(2001) });
    expect(res.status).toBe(400);
  });

  it('returns 404 when commenting on a missing card', async () => {
    const res = await request(app).post('/api/cards/999999/comments').send({ text: 'hi' });
    expect(res.status).toBe(404);
  });

  it('deletes a comment but refuses to delete a system event', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C1', 0);

    const created = await request(app).post(`/api/cards/${card.id}/comments`).send({ text: 'hi' });
    const commentId: number = created.body.data.id;

    const items = await getActivity(card.id);
    const systemEvent = items.find((i) => i.kind === 'created');
    expect(systemEvent).toBeTruthy();

    const refused = await request(app).delete(`/api/activity/${systemEvent?.id}`);
    expect(refused.status).toBe(400);

    const ok = await request(app).delete(`/api/activity/${commentId}`);
    expect(ok.status).toBe(200);
    expect((await getActivity(card.id)).some((i) => i.id === commentId)).toBe(false);
  });

  it('returns 404 when deleting a missing activity record', async () => {
    const res = await request(app).delete('/api/activity/999999');
    expect(res.status).toBe(404);
  });

  it('exposes commentCount on both the card and the board payload', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const card = await createCard(list.id, 'C1', 0);
    expect(card.commentCount).toBe(0);

    await request(app).post(`/api/cards/${card.id}/comments`).send({ text: 'a' });
    await request(app).post(`/api/cards/${card.id}/comments`).send({ text: 'b' });

    const single = await request(app).get(`/api/cards/${card.id}`);
    expect(single.body.data.commentCount).toBe(2);

    const detail = await request(app).get(`/api/boards/${board.id}`);
    expect(detail.body.data.cards[0].commentCount).toBe(2);
  });
});

describe('list batch actions', () => {
  it('clears completed cards only', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const c1 = await createCard(list.id, 'done', 0);
    const c2 = await createCard(list.id, 'todo', 1);
    await request(app).patch(`/api/cards/${c1.id}`).send({ completed: 1 });

    const res = await request(app)
      .post(`/api/lists/${list.id}/batch`)
      .send({ action: 'clear-completed' });
    expect(res.status).toBe(200);
    expect(res.body.data.affected).toBe(1);

    const detail = await request(app).get(`/api/boards/${board.id}`);
    expect(detail.body.data.cards.map((c: { id: number }) => c.id)).toEqual([c2.id]);
  });

  it('completes all open cards and logs a batch activity', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const c1 = await createCard(list.id, 'a', 0);
    await createCard(list.id, 'b', 1);

    const res = await request(app)
      .post(`/api/lists/${list.id}/batch`)
      .send({ action: 'complete-all' });
    expect(res.body.data.affected).toBe(2);

    const detail = await request(app).get(`/api/boards/${board.id}`);
    expect(detail.body.data.cards.every((c: { completed: number }) => c.completed === 1)).toBe(
      true
    );
    expect((await getActivity(c1.id)).some((i) => i.kind === 'batch')).toBe(true);
  });

  it('reopens all completed cards', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const c1 = await createCard(list.id, 'a', 0);
    await request(app).patch(`/api/cards/${c1.id}`).send({ completed: 1 });

    const res = await request(app)
      .post(`/api/lists/${list.id}/batch`)
      .send({ action: 'reopen-all' });
    expect(res.body.data.affected).toBe(1);

    const after = await request(app).get(`/api/cards/${c1.id}`);
    expect(after.body.data.completed).toBe(0);
  });

  it('moves all cards to the target list, appending after existing ones', async () => {
    const board = await createBoard();
    const src = await createList(board.id, '源', 0);
    const dst = await createList(board.id, '目标', 1);
    const existing = await createCard(dst.id, 'existing', 0);
    const a = await createCard(src.id, 'a', 0);
    const b = await createCard(src.id, 'b', 1);

    const res = await request(app)
      .post(`/api/lists/${src.id}/batch`)
      .send({ action: 'move-all', targetListId: dst.id });
    expect(res.body.data.affected).toBe(2);

    const moved = await request(app).get(`/api/lists/${dst.id}/cards`);
    expect(moved.body.data.map((c: { id: number }) => c.id)).toEqual([existing.id, a.id, b.id]);
    expect((await request(app).get(`/api/lists/${src.id}/cards`)).body.data.length).toBe(0);
  });

  it('moves only completed cards with move-completed', async () => {
    const board = await createBoard();
    const src = await createList(board.id, '源', 0);
    const dst = await createList(board.id, '归档', 1);
    const done = await createCard(src.id, 'done', 0);
    const open = await createCard(src.id, 'open', 1);
    await request(app).patch(`/api/cards/${done.id}`).send({ completed: 1 });

    const res = await request(app)
      .post(`/api/lists/${src.id}/batch`)
      .send({ action: 'move-completed', targetListId: dst.id });
    expect(res.body.data.affected).toBe(1);

    expect((await request(app).get(`/api/lists/${dst.id}/cards`)).body.data[0].id).toBe(done.id);
    expect((await request(app).get(`/api/lists/${src.id}/cards`)).body.data[0].id).toBe(open.id);
  });

  it('rejects an unknown action', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    const res = await request(app).post(`/api/lists/${list.id}/batch`).send({ action: 'nuke' });
    expect(res.status).toBe(400);
  });

  it('rejects a move without a valid target list', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);

    const missing = await request(app)
      .post(`/api/lists/${list.id}/batch`)
      .send({ action: 'move-all' });
    expect(missing.status).toBe(400);

    const same = await request(app)
      .post(`/api/lists/${list.id}/batch`)
      .send({ action: 'move-all', targetListId: list.id });
    expect(same.status).toBe(400);

    const unknown = await request(app)
      .post(`/api/lists/${list.id}/batch`)
      .send({ action: 'move-all', targetListId: 999999 });
    expect(unknown.status).toBe(404);
  });

  it('returns 404 for a batch action on a missing list', async () => {
    const res = await request(app).post('/api/lists/999999/batch').send({ action: 'complete-all' });
    expect(res.status).toBe(404);
  });

  it('reports affected=0 when nothing matches', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'A', 0);
    await createCard(list.id, 'open', 0);

    const res = await request(app)
      .post(`/api/lists/${list.id}/batch`)
      .send({ action: 'clear-completed' });
    expect(res.body.data.affected).toBe(0);
    expect(res.body.data.cardIds).toEqual([]);
  });
});
