import { db } from '../db';
import type { Checkin, CheckinRow, FrequencyType, Habit, HabitInput, HabitRow } from '../types';

function rowToHabit(row: HabitRow, checkinDates: string[]): Habit {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    frequencyType: row.frequency_type as FrequencyType,
    targetCount: row.target_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    checkins: checkinDates,
    totalCheckins: checkinDates.length,
  };
}

function listCheckinDates(habitId: number): string[] {
  const rows = db
    .prepare('SELECT date FROM checkin WHERE habit_id = ? ORDER BY date ASC')
    .all(habitId) as { date: string }[];
  return rows.map((r) => r.date);
}

function rowToCheckin(row: CheckinRow): Checkin {
  return {
    id: row.id,
    habitId: row.habit_id,
    date: row.date,
    createdAt: row.created_at,
  };
}

function normalizeFrequency(raw: unknown): FrequencyType {
  return raw === 'weekly' ? 'weekly' : 'daily';
}

function normalizeTargetCount(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, 99);
}

/** 习惯养成数据访问层。 */
export const habitRepo = {
  list(): Habit[] {
    const rows = db.prepare('SELECT * FROM habit ORDER BY created_at DESC, id DESC').all() as HabitRow[];
    return rows.map((row) => rowToHabit(row, listCheckinDates(row.id)));
  },

  getById(id: number): Habit | undefined {
    const row = db.prepare('SELECT * FROM habit WHERE id = ?').get(id) as HabitRow | undefined;
    return row ? rowToHabit(row, listCheckinDates(row.id)) : undefined;
  },

  create(input: HabitInput): Habit {
    const now: string = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO habit (name, icon, frequency_type, target_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(input.name, input.icon, input.frequencyType, input.targetCount, now, now);
    return this.getById(Number(info.lastInsertRowid)) as Habit;
  },

  update(id: number, patch: Partial<HabitInput>): Habit | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;

    const fields: string[] = [];
    const params: unknown[] = [];
    if (patch.name !== undefined) {
      fields.push('name = ?');
      params.push(patch.name);
    }
    if (patch.icon !== undefined) {
      fields.push('icon = ?');
      params.push(patch.icon);
    }
    if (patch.frequencyType !== undefined) {
      fields.push('frequency_type = ?');
      params.push(patch.frequencyType);
    }
    if (patch.targetCount !== undefined) {
      fields.push('target_count = ?');
      params.push(patch.targetCount);
    }
    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    if (fields.length > 1) {
      db.prepare(`UPDATE habit SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    }
    return this.getById(id);
  },

  remove(id: number): void {
    db.prepare('DELETE FROM habit WHERE id = ?').run(id);
  },

  /** 打卡；当天已打卡时返回 null（不重复插入）。 */
  addCheckin(habitId: number, date: string): Checkin | null {
    const habit = db.prepare('SELECT id FROM habit WHERE id = ?').get(habitId);
    if (!habit) return null;
    const exists = db.prepare('SELECT id FROM checkin WHERE habit_id = ? AND date = ?').get(habitId, date);
    if (exists) return null;
    const now: string = new Date().toISOString();
    const info = db
      .prepare('INSERT INTO checkin (habit_id, date, created_at) VALUES (?, ?, ?)')
      .run(habitId, date, now);
    const row = db
      .prepare('SELECT * FROM checkin WHERE id = ?')
      .get(info.lastInsertRowid) as CheckinRow;
    return rowToCheckin(row);
  },

  /** 取消某天打卡；返回是否真的删除了一行。 */
  removeCheckin(habitId: number, date: string): boolean {
    const info = db.prepare('DELETE FROM checkin WHERE habit_id = ? AND date = ?').run(habitId, date);
    return info.changes > 0;
  },
};

export { normalizeFrequency, normalizeTargetCount };
export default habitRepo;
