import fs from 'fs';
import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { ensureUploadDir, storedFileName, uploadPath } from '../lib/files';
import { sanitizeFileName, generateCode } from '../lib/code';

/**
 * 图片节点上传：复用 fileshare 的零依赖二进制上传思路
 * （express.raw 解析 application/octet-stream，文件名走 X-File-Name 头）。
 * 返回可公开访问的 URL，前端写入 image 节点的 content 字段。
 */
export const uploadsRouter: Router = Router();

uploadsRouter.post(
  '/uploads',
  express.raw({ type: 'application/octet-stream', limit: '25mb' }),
  asyncHandler((req: Request, res: Response): void => {
    const body: unknown = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ code: 40001, message: '文件内容为空', data: null });
      return;
    }
    const headerName: string =
      typeof req.headers['x-file-name'] === 'string' ? req.headers['x-file-name'] : '';
    const queryName: string = typeof req.query.filename === 'string' ? req.query.filename : '';
    const rawName = headerName || queryName || 'image';
    const safeName = sanitizeFileName(decodeURIComponent(rawName));
    ensureUploadDir();
    const code = generateCode(10);
    const stored = storedFileName(code, safeName);
    fs.writeFileSync(uploadPath(stored), body);
    res.status(201).json({
      code: 0,
      message: 'ok',
      data: { code, url: `/api/uploads/${stored}`, name: safeName, size: body.length },
    });
  }),
);
