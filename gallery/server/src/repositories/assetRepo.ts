import db from '../db';
import { generateCode } from '../lib/code';
import type { Asset, Album, Tag, AssetFilter } from '../types';

interface AssetRow {
  id: number;
  code: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  taken_at: string | null;
  created_at: string;
}

function rowToAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    code: row.code,
    originalName: row.original_name,
    storedName: row.stored_name,
    mimeType: row.mime_type,
    size: row.size,
    width: row.width,
    height: row.height,
    takenAt: row.taken_at,
    createdAt: row.created_at,
  };
}

/** 短码唯一性冲突重试的最大次数。 */
const CODE_COLLISION_RETRIES = 16;

/** 创建资源记录（内部生成短码并防碰撞），返回记录与最终短码。 */
export function createAsset(input: {
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  takenAt?: string | null;
}): { asset: Asset; code: string } {
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO assets (code, original_name, stored_name, mime_type, size, width, height, taken_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (let attempt = 0; attempt < CODE_COLLISION_RETRIES; attempt += 1) {
    const code = generateCode(8);
    try {
      const info = insert.run(
        code,
        input.originalName,
        input.storedName,
        input.mimeType,
        input.size,
        input.width ?? null,
        input.height ?? null,
        input.takenAt ?? null,
        now
      );
      const id = Number(info.lastInsertRowid);
      return { asset: getAssetById(id)!, code };
    } catch (err) {
      const sqliteErr = err as { code?: string };
      const isUnique =
        typeof sqliteErr.code === 'string' && sqliteErr.code.startsWith('SQLITE_CONSTRAINT');
      if (!isUnique) {
        throw err;
      }
      // 短码冲突：继续下一次重试。
    }
  }
  throw new Error('生成资源短码失败，请重试');
}

/** 落盘后回填 stored_name（磁盘文件名 = 短码 + 扩展名）。 */
export function setAssetStoredName(id: number, storedName: string): void {
  db.prepare('UPDATE assets SET stored_name = ? WHERE id = ?').run(storedName, id);
}

export function getAssetById(id: number): Asset | null {
  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as AssetRow | undefined;
  return row ? rowToAsset(row) : null;
}

export function getAssetByCode(code: string): Asset | null {
  const row = db.prepare('SELECT * FROM assets WHERE code = ?').get(code) as AssetRow | undefined;
  return row ? rowToAsset(row) : null;
}

/** 列出资源，支持按相册 / 标签 / 时间区间筛选。 */
export function listAssets(filter: AssetFilter = {}): Asset[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.albumId != null) {
    where.push('a.id IN (SELECT asset_id FROM album_assets WHERE album_id = ?)');
    params.push(filter.albumId);
  }
  if (filter.tag) {
    where.push(
      'a.id IN (SELECT atm.asset_id FROM asset_tag_map atm JOIN asset_tags t ON t.id = atm.tag_id WHERE t.name = ?)'
    );
    params.push(filter.tag);
  }
  if (filter.from) {
    where.push('a.created_at >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    where.push('a.created_at <= ?');
    params.push(filter.to);
  }
  const sql =
    `SELECT a.* FROM assets a ${where.length ? `WHERE ${where.join(' AND ')}` : ''}` +
    ' ORDER BY a.created_at DESC, a.id DESC';
  const rows = db.prepare(sql).all(...params) as AssetRow[];
  return rows.map(rowToAsset);
}

/** 删除资源记录，返回被删除记录的 stored_name（磁盘清理由调用方完成）。 */
export function deleteAsset(id: number): { deleted: boolean; storedName?: string } {
  const row = db
    .prepare('SELECT stored_name FROM assets WHERE id = ?')
    .get(id) as { stored_name: string } | undefined;
  if (!row) {
    return { deleted: false };
  }
  db.prepare('DELETE FROM assets WHERE id = ?').run(id);
  return { deleted: true, storedName: row.stored_name };
}

// ---------------- 相册 ----------------

interface AlbumRow {
  id: number;
  name: string;
  created_at: string;
  asset_count: number;
}

function rowToAlbum(row: AlbumRow): Album {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    assetCount: row.asset_count,
  };
}

export function createAlbum(name: string): Album {
  const now = new Date().toISOString();
  const info = db.prepare('INSERT INTO albums (name, created_at) VALUES (?, ?)').run(name, now);
  return getAlbum(Number(info.lastInsertRowid))!;
}

export function getAlbum(id: number): Album | null {
  const row = db
    .prepare(
      `SELECT al.*, (SELECT COUNT(*) FROM album_assets aa WHERE aa.album_id = al.id) AS asset_count
       FROM albums al WHERE al.id = ?`
    )
    .get(id) as AlbumRow | undefined;
  return row ? rowToAlbum(row) : null;
}

export function listAlbums(): Album[] {
  const rows = db
    .prepare(
      `SELECT al.*, (SELECT COUNT(*) FROM album_assets aa WHERE aa.album_id = al.id) AS asset_count
       FROM albums al ORDER BY al.created_at DESC, al.id DESC`
    )
    .all() as AlbumRow[];
  return rows.map(rowToAlbum);
}

export function renameAlbum(id: number, name: string): Album | null {
  const info = db.prepare('UPDATE albums SET name = ? WHERE id = ?').run(name, id);
  if (info.changes === 0) {
    return null;
  }
  return getAlbum(id);
}

export function deleteAlbum(id: number): boolean {
  const info = db.prepare('DELETE FROM albums WHERE id = ?').run(id);
  return info.changes > 0;
}

export function addAssetToAlbum(albumId: number, assetId: number): void {
  db.prepare('INSERT OR IGNORE INTO album_assets (album_id, asset_id) VALUES (?, ?)').run(
    albumId,
    assetId
  );
}

export function removeAssetFromAlbum(albumId: number, assetId: number): void {
  db.prepare('DELETE FROM album_assets WHERE album_id = ? AND asset_id = ?').run(albumId, assetId);
}

export function listAssetsInAlbum(albumId: number): Asset[] {
  const rows = db
    .prepare(
      `SELECT a.* FROM assets a
       JOIN album_assets aa ON aa.asset_id = a.id
       WHERE aa.album_id = ?
       ORDER BY a.created_at DESC, a.id DESC`
    )
    .all(albumId) as AssetRow[];
  return rows.map(rowToAsset);
}

export function getAlbumsForAsset(assetId: number): Album[] {
  const rows = db
    .prepare(
      `SELECT al.*, (SELECT COUNT(*) FROM album_assets aa WHERE aa.album_id = al.id) AS asset_count
       FROM albums al JOIN album_assets aa ON aa.album_id = al.id
       WHERE aa.asset_id = ? ORDER BY al.name`
    )
    .all(assetId) as AlbumRow[];
  return rows.map(rowToAlbum);
}

// ---------------- 标签 ----------------

interface TagRow {
  id: number;
  name: string;
  count: number;
}

function rowToTag(row: TagRow): Tag {
  return { id: row.id, name: row.name, count: row.count };
}

export function createTag(name: string): Tag {
  db.prepare('INSERT OR IGNORE INTO asset_tags (name) VALUES (?)').run(name);
  return getTagByName(name)!;
}

export function getTagByName(name: string): Tag | null {
  const row = db
    .prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM asset_tag_map m WHERE m.tag_id = t.id) AS count
       FROM asset_tags t WHERE t.name = ?`
    )
    .get(name) as TagRow | undefined;
  return row ? rowToTag(row) : null;
}

export function listTags(): Tag[] {
  const rows = db
    .prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM asset_tag_map m WHERE m.tag_id = t.id) AS count
       FROM asset_tags t ORDER BY t.name`
    )
    .all() as TagRow[];
  return rows.map(rowToTag);
}

export function tagAsset(assetId: number, name: string): Tag {
  const tag = createTag(name);
  db.prepare('INSERT OR IGNORE INTO asset_tag_map (asset_id, tag_id) VALUES (?, ?)').run(
    assetId,
    tag.id
  );
  return tag;
}

export function untagAsset(assetId: number, tagId: number): void {
  db.prepare('DELETE FROM asset_tag_map WHERE asset_id = ? AND tag_id = ?').run(assetId, tagId);
}

export function getTagsForAsset(assetId: number): Tag[] {
  const rows = db
    .prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM asset_tag_map m WHERE m.tag_id = t.id) AS count
       FROM asset_tags t JOIN asset_tag_map m ON m.tag_id = t.id
       WHERE m.asset_id = ? ORDER BY t.name`
    )
    .all(assetId) as TagRow[];
  return rows.map(rowToTag);
}
