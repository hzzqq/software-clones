import db from '../db';
import { Tag } from '../types';

export function listTags(): Tag[] {
  const sql = `
    SELECT t.id, t.name, COUNT(nt.note_id) AS count
    FROM tags t
    LEFT JOIN note_tags nt ON nt.tag_id = t.id
    GROUP BY t.id
    ORDER BY count DESC, t.name ASC
  `;
  const rows = db.prepare(sql).all() as { id: number; name: string; count: number }[];
  return rows.map((r) => ({ id: r.id, name: r.name, count: r.count }));
}
