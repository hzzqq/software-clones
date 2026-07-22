import { db } from '../db';

interface SettingRow {
  key: string;
  value: string;
}

/**
 * Data-access layer for user settings. Keys/values are stored as TEXT (the
 * value holds a JSON-encoded string when complex).
 */
export const settingRepo = {
  getAll(): Record<string, string> {
    const rows = db.prepare('SELECT * FROM user_setting').all() as SettingRow[];
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  },

  set(key: string, value: string): void {
    db.prepare(
      `INSERT INTO user_setting (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(key, value);
  },
};

export default settingRepo;
