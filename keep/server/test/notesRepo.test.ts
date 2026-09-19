import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 使用隔离的临时数据库，避免污染真实数据文件。
const dbFile = path.join(os.tmpdir(), `keep-server-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = dbFile;
process.env.CORS_ORIGIN = '*';

let notesRepo: typeof import('../src/repositories/notesRepo');

beforeAll(async () => {
  notesRepo = await import('../src/repositories/notesRepo');
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

describe('notes repository', () => {
  test('create + get 便签含默认字段', () => {
    const note = notesRepo.createNote({ title: '买菜', body: '牛奶鸡蛋' });
    expect(note.id).toBeGreaterThan(0);
    expect(note.title).toBe('买菜');
    expect(note.color).toBe('default');
    expect(note.isPinned).toBe(false);
    expect(note.isArchived).toBe(false);
    expect(note.isTrash).toBe(false);
    expect(note.labels).toEqual([]);
    expect(note.items).toEqual([]);

    const fetched = notesRepo.getNote(note.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.body).toBe('牛奶鸡蛋');
  });

  test('标签多对多 + 按标签筛选 + 计数', () => {
    notesRepo.createNote({ title: 'A', labels: ['work', 'idea'] });
    notesRepo.createNote({ title: 'B', labels: ['idea'] });

    const filtered = notesRepo.listNotes({ label: 'idea' });
    expect(filtered.length).toBe(2);

    const labels = notesRepo.listLabels();
    const idea = labels.find((l) => l.name === 'idea');
    expect(idea?.count).toBe(2);
    const work = labels.find((l) => l.name === 'work');
    expect(work?.count).toBe(1);
  });

  test('checklist 勾选项持久化', () => {
    const note = notesRepo.createNote({
      title: '清单',
      items: [
        { text: '第一步', done: false, sortOrder: 0 },
        { text: '第二步', done: true, sortOrder: 1 },
      ],
    });
    const fetched = notesRepo.getNote(note.id)!;
    expect(fetched.items).toHaveLength(2);
    expect(fetched.items[0]).toMatchObject({ text: '第一步', done: false });
    expect(fetched.items[1]).toMatchObject({ text: '第二步', done: true });
  });

  test('置顶优先 + 视图筛选', () => {
    const a = notesRepo.createNote({ title: '普通' });
    const b = notesRepo.createNote({ title: '置顶', isPinned: true });
    const list = notesRepo.listNotes({ view: 'active' });
    expect(list[0].id).toBe(b.id);

    // 归档
    notesRepo.updateNote(a.id, { isArchived: true });
    const active = notesRepo.listNotes({ view: 'active' });
    expect(active.find((n) => n.id === a.id)).toBeUndefined();
    const archived = notesRepo.listNotes({ view: 'archived' });
    expect(archived.find((n) => n.id === a.id)).toBeDefined();

    // 回收站：归档后也进 trash 才是 trash 视图
    notesRepo.updateNote(b.id, { isTrash: true });
    const trash = notesRepo.listNotes({ view: 'trash' });
    expect(trash.find((n) => n.id === b.id)).toBeDefined();
  });

  test('delete 便签', () => {
    const note = notesRepo.createNote({ title: '临时' });
    expect(notesRepo.deleteNote(note.id)).toBe(true);
    expect(notesRepo.getNote(note.id)).toBeNull();
  });
});
