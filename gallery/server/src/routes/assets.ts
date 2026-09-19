import fs from 'fs';
import path from 'path';
import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { MAX_FILE_SIZE } from '../config';
import { ensureGalleryDir, storedFileName, assetDiskPath } from '../lib/files';
import { sanitizeFileName } from '../lib/code';
import {
  createAsset,
  setAssetStoredName,
  getAssetById,
  listAssets,
  deleteAsset,
  getAlbumsForAsset,
  getTagsForAsset,
} from '../repositories/assetRepo';
import type { AssetFilter } from '../types';

/**
 * 资源（图片）REST 路由。
 *
 * 上传采用 `express.raw` 解析 `application/octet-stream` 原始二进制，
 * 文件名通过 `X-File-Name` 头（URL 编码）传递——零 multer 实现文件上传。
 * 图片本体以「短码 + 扩展名」落盘到 `data/gallery/`，元信息入 SQLite。
 */
export const assetsRouter: Router = Router();

/** 从请求头读取可选的整数（宽/高）。 */
function headerInt(value: string | string[] | undefined): number | null {
  if (value == null) {
    return null;
  }
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

// 上传：原始二进制 body，limit 由配置控制（超限时 body-parser 抛 413）。
assetsRouter.post(
  '/assets',
  express.raw({ type: 'application/octet-stream', limit: MAX_FILE_SIZE }),
  asyncHandler((req: Request, res: Response): void => {
    const body: unknown = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ code: 40001, message: '文件内容为空，请选择文件后上传', data: null });
      return;
    }

    const headerName: string =
      typeof req.headers['x-file-name'] === 'string' ? req.headers['x-file-name'] : '';
    const queryName: string = typeof req.query.filename === 'string' ? req.query.filename : '';
    const rawName: string = headerName || queryName || 'unnamed';
    const safeName: string = sanitizeFileName(decodeURIComponent(rawName));

    const mimeType: string =
      typeof req.headers['x-mime-type'] === 'string' && req.headers['x-mime-type']
        ? req.headers['x-mime-type']
        : 'application/octet-stream';
    const width = headerInt(req.headers['x-width']);
    const height = headerInt(req.headers['x-height']);
    const takenAt: string | null =
      typeof req.headers['x-taken-at'] === 'string' && req.headers['x-taken-at']
        ? req.headers['x-taken-at']
        : null;

    ensureGalleryDir();
    // 先建记录（内部生成短码），再以「短码 + 扩展名」落盘，最后回填 stored_name。
    const created = createAsset({
      originalName: safeName,
      storedName: safeName,
      mimeType,
      size: body.length,
      width,
      height,
      takenAt,
    });
    const ext = path.extname(safeName);
    const finalStored = storedFileName(created.code, ext);
    fs.writeFileSync(assetDiskPath(finalStored), body);
    setAssetStoredName(created.asset.id, finalStored);

    res.status(201).json({ code: 0, message: 'ok', data: getAssetById(created.asset.id) });
  })
);

// 列表（支持 ?album= / ?tag= / ?from= / ?to= 筛选）
assetsRouter.get(
  '/assets',
  asyncHandler((req: Request, res: Response): void => {
    const filter: AssetFilter = {};
    if (typeof req.query.album === 'string' && req.query.album) {
      const albumId = Number(req.query.album);
      if (Number.isInteger(albumId)) filter.albumId = albumId;
    }
    if (typeof req.query.tag === 'string' && req.query.tag) {
      filter.tag = req.query.tag;
    }
    if (typeof req.query.from === 'string' && req.query.from) {
      filter.from = req.query.from;
    }
    if (typeof req.query.to === 'string' && req.query.to) {
      filter.to = req.query.to;
    }
    res.json({ code: 0, message: 'ok', data: listAssets(filter) });
  })
);

// 单个资源元信息
assetsRouter.get(
  '/assets/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ code: 40001, message: '资源 ID 不合法', data: null });
      return;
    }
    const asset = getAssetById(id);
    if (!asset) {
      res.status(404).json({ code: 40400, message: '资源不存在', data: null });
      return;
    }
    res.json({
      code: 0,
      message: 'ok',
      data: {
        ...asset,
        albums: getAlbumsForAsset(asset.id),
        tags: getTagsForAsset(asset.id),
      },
    });
  })
);

// 流式返回图片（inline，供 <img> 缩略图与灯箱预览使用）
assetsRouter.get(
  '/assets/:id/file',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ code: 40001, message: '资源 ID 不合法', data: null });
      return;
    }
    const asset = getAssetById(id);
    if (!asset) {
      res.status(404).json({ code: 40400, message: '资源不存在', data: null });
      return;
    }
    const diskPath = assetDiskPath(asset.storedName);
    if (!fs.existsSync(diskPath)) {
      res.status(404).json({ code: 40400, message: '图片文件缺失', data: null });
      return;
    }
    const filename: string = asset.originalName;
    // 旧版 filename 参数仅允许 ASCII，用百分号编码后的安全回退；
    // 真实 UTF-8 文件名通过 RFC 6266 的 filename* 传递，浏览器优先采用。
    const asciiFallback: string = encodeURIComponent(filename).replace(/[%"'\\]/g, '_');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', String(asset.size));
    const stream = fs.createReadStream(diskPath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ code: 50000, message: '读取图片失败', data: null });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  })
);

// 删除：移除记录 + 磁盘文件
assetsRouter.delete(
  '/assets/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ code: 40001, message: '资源 ID 不合法', data: null });
      return;
    }
    const result = deleteAsset(id);
    if (!result.deleted) {
      res.status(404).json({ code: 40400, message: '资源不存在', data: null });
      return;
    }
    if (result.storedName) {
      try {
        fs.rmSync(assetDiskPath(result.storedName), { force: true });
      } catch {
        /* 磁盘文件缺失时忽略 */
      }
    }
    res.json({ code: 0, message: 'ok', data: { ok: true } });
  })
);

// 资源所属的相册
assetsRouter.get(
  '/assets/:id/albums',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ code: 40001, message: '资源 ID 不合法', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: getAlbumsForAsset(id) });
  })
);
