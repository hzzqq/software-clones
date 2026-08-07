import fs from 'fs';
import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { MAX_FILE_SIZE } from '../config';
import db from '../db';
import { ensureUploadDir, storedFileName, uploadPath } from '../lib/files';
import { sanitizeFileName } from '../lib/code';
import {
  createFile,
  deleteFileById,
  getFileByCode,
  incrementDownloadCount,
  listFiles,
} from '../repositories/fileRepo';

/**
 * 文件分享 REST 路由。
 *
 * 上传采用 `express.raw` 解析 `application/octet-stream` 原始二进制，
 * 文件名通过 `X-File-Name` 请求头传递（URL 编码）——零新增依赖实现文件上传，
 * 避免引入 multer。
 */
export const filesRouter: Router = Router();

// 上传：原始二进制 body，limit 由配置控制（超限时 body-parser 抛 413）。
filesRouter.post(
  '/files',
  express.raw({
    type: 'application/octet-stream',
    limit: MAX_FILE_SIZE,
  }),
  asyncHandler((req: Request, res: Response): void => {
    const body: unknown = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ code: 40001, message: '文件内容为空，请选择文件后上传', data: null });
      return;
    }

    // 从 X-File-Name 头（URL 编码）读取文件名，兼容 query 参数。
    const headerName: string =
      typeof req.headers['x-file-name'] === 'string' ? req.headers['x-file-name'] : '';
    const queryName: string = typeof req.query.filename === 'string' ? req.query.filename : '';
    const rawName: string = headerName || queryName;
    const safeName: string = sanitizeFileName(decodeURIComponent(rawName));

    ensureUploadDir();
    // 先生成短码并写库（内部防碰撞重试），拿到 code 后再以「短码_文件名」落盘。
    const created = createFile({
      originalName: safeName,
      storedName: safeName, // stored_name 稍后用真实 code 覆盖写入
      size: body.length,
      mimeType: 'application/octet-stream',
    });
    const finalStored = storedFileName(created.code, safeName);
    fs.writeFileSync(uploadPath(finalStored), body);
    // stored_name 更新为短码前缀，保证磁盘文件名全局唯一。
    updateStoredName(created.file.id, finalStored);

    const record = getFileByCode(created.code)!;
    res.status(201).json({
      code: 0,
      message: 'ok',
      data: record,
    });
  })
);

/** 更新 stored_name（upload 内部用，把占位名换成「短码_文件名」）。 */
function updateStoredName(id: number, storedName: string): void {
  db.prepare('UPDATE files SET stored_name = ? WHERE id = ?').run(storedName, id);
}

// 列表
filesRouter.get(
  '/files',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listFiles() });
  })
);

// 短码查询元信息（分享页展示）
filesRouter.get(
  '/files/:code/meta',
  asyncHandler((req: Request, res: Response): void => {
    const file = getFileByCode(req.params.code);
    if (!file) {
      res.status(404).json({ code: 40400, message: '文件不存在或已被删除', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: file });
  })
);

// 下载：Content-Disposition attachment，UTF-8 文件名；下载计数 +1。
filesRouter.get(
  '/files/:code/download',
  asyncHandler((req: Request, res: Response): void => {
    const file = getFileByCode(req.params.code);
    if (!file) {
      res.status(404).json({ code: 40400, message: '文件不存在或已被删除', data: null });
      return;
    }
    const diskPath = uploadPath(storedFileName(file.code, file.originalName));
    if (!fs.existsSync(diskPath)) {
      res.status(404).json({ code: 40400, message: '文件内容缺失，请联系管理员', data: null });
      return;
    }
    // 计数 +1（每次发起下载都计数）。
    incrementDownloadCount(file.code);

    const filename: string = file.originalName;
    // 旧版 filename 参数仅允许 ASCII，故使用百分号编码后的安全回退；
    // 真实 UTF-8 文件名通过 RFC 6266 的 filename* 传递，浏览器优先采用。
    const asciiFallback: string = encodeURIComponent(filename).replace(/[%"'\\]/g, '_');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', String(file.size));
    const stream = fs.createReadStream(diskPath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ code: 50000, message: '读取文件失败', data: null });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  })
);

// 删除：移除记录 + 磁盘文件
filesRouter.delete(
  '/files/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ code: 40001, message: '文件 ID 不合法', data: null });
      return;
    }
    const result = deleteFileById(id);
    if (!result.deleted) {
      res.status(404).json({ code: 40400, message: '文件不存在或已被删除', data: null });
      return;
    }
    if (result.storedName) {
      try {
        fs.rmSync(uploadPath(result.storedName), { force: true });
      } catch {
        /* 磁盘文件缺失时忽略 */
      }
    }
    res.json({ code: 0, message: 'ok', data: { ok: true } });
  })
);
