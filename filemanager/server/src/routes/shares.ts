import fs from 'fs';
import path from 'path';
import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { FM_ROOT } from '../config';
import { resolveSafe, toRelative } from '../lib/fsPath';
import { createShare, getShareByCode, listShares, deleteShare, resolveShareTarget } from '../repositories/shareRepo';

/**
 * 路径分享短链路由：创建/列表/删除分享；以及通过短码下载被分享文件。
 */
export const sharesRouter: Router = Router();

// 创建分享
sharesRouter.post(
  '/shares',
  asyncHandler((req: Request, res: Response): void => {
    const rawPath: string = typeof req.body?.path === 'string' ? req.body.path : '';
    const abs = resolveSafe(FM_ROOT, rawPath);
    if (!abs) {
      res.status(400).json({ code: 40001, message: '非法路径（可能越界）', data: null });
      return;
    }
    if (!fs.existsSync(abs)) {
      res.status(404).json({ code: 40400, message: '路径不存在', data: null });
      return;
    }
    const expiry: string | null =
      typeof req.body?.expiry === 'string' && req.body.expiry ? req.body.expiry : null;
    const share = createShare({ path: toRelative(FM_ROOT, abs), expiry });
    res.status(201).json({ code: 0, message: 'ok', data: share });
  })
);

// 列表
sharesRouter.get(
  '/shares',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listShares() });
  })
);

// 删除
sharesRouter.delete(
  '/shares/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ code: 40001, message: 'ID 不合法', data: null });
      return;
    }
    if (!deleteShare(id)) {
      res.status(404).json({ code: 40400, message: '分享不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: { ok: true } });
  })
);

// 通过短码下载（attachment 流式返回）
sharesRouter.get(
  '/s/:code',
  asyncHandler((req: Request, res: Response): void => {
    const share = getShareByCode(req.params.code);
    if (!share) {
      res.status(404).json({ code: 40400, message: '分享不存在或已失效', data: null });
      return;
    }
    const abs = resolveShareTarget(share);
    if (!abs || !fs.existsSync(abs)) {
      res.status(404).json({ code: 40400, message: '分享目标不存在或已失效', data: null });
      return;
    }
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      res.status(400).json({ code: 40001, message: '该分享是目录，无法下载', data: null });
      return;
    }
    const name = path.basename(abs);
    const asciiFallback: string = encodeURIComponent(name).replace(/[%"'\\]/g, '_');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(name)}`
    );
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', String(stat.size));
    const stream = fs.createReadStream(abs);
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
