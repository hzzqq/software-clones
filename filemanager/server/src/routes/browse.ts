import fs from 'fs';
import path from 'path';
import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { FM_ROOT } from '../config';
import { resolveSafe, toRelative, parentRelative } from '../lib/fsPath';
import type { BrowseResult, FsEntry } from '../types';

/**
 * 目录浏览 / 预览 / 下载路由。
 * 所有路径访问前都经过 resolveSafe 校验，严格限定在虚拟根目录内。
 */

export const browseRouter: Router = Router();

const TEXT_EXT = new Set([
  'txt', 'md', 'markdown', 'json', 'js', 'ts', 'tsx', 'jsx', 'mjs', 'cjs',
  'css', 'html', 'htm', 'xml', 'yml', 'yaml', 'log', 'csv', 'ini', 'env',
  'sh', 'bat', 'ps1', 'py', 'go', 'java', 'c', 'cpp', 'h', 'hpp', 'rs',
  'sql', 'toml', 'gitignore', 'editorconfig',
]);

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif', 'ico']);

export function isTextFile(name: string): boolean {
  return TEXT_EXT.has(path.extname(name).slice(1).toLowerCase());
}

export function isImageFile(name: string): boolean {
  return IMAGE_EXT.has(path.extname(name).slice(1).toLowerCase());
}

/** 以 inline 方式流式返回文件（供图片预览）。 */
function streamInline(abs: string, name: string, size: number, res: Response): void {
  const asciiFallback: string = encodeURIComponent(name).replace(/[%"'\\]/g, '_');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(name)}`
  );
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', String(size));
  const stream = fs.createReadStream(abs);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(500).json({ code: 50000, message: '读取文件失败', data: null });
    } else {
      res.end();
    }
  });
  stream.pipe(res);
}

// 目录浏览
browseRouter.get(
  '/browse',
  asyncHandler((req: Request, res: Response): void => {
    const userPath: string = typeof req.query.path === 'string' ? req.query.path : '/';
    const abs = resolveSafe(FM_ROOT, userPath);
    if (!abs) {
      res.status(400).json({ code: 40001, message: '非法路径（可能越界）', data: null });
      return;
    }
    if (!fs.existsSync(abs)) {
      res.status(404).json({ code: 40400, message: '路径不存在', data: null });
      return;
    }
    const stat = fs.statSync(abs);
    if (!stat.isDirectory()) {
      res.status(400).json({ code: 40001, message: '该路径不是目录', data: null });
      return;
    }
    const names: string[] = fs.readdirSync(abs);
    const entries: FsEntry[] = names
      .map((name) => {
        const p = path.join(abs, name);
        let s: fs.Stats;
        try {
          s = fs.statSync(p);
        } catch {
          return null;
        }
        return {
          name,
          path: toRelative(FM_ROOT, p),
          isDir: s.isDirectory(),
          size: s.isDirectory() ? null : s.size,
          modified: s.mtime.toISOString(),
        } as FsEntry;
      })
      .filter((e): e is FsEntry => e !== null)
      .sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));

    const result: BrowseResult = {
      path: toRelative(FM_ROOT, abs),
      parent: parentRelative(FM_ROOT, abs),
      entries,
    };
    res.json({ code: 0, message: 'ok', data: result });
  })
);

// 预览：文本直接返回（text/plain），图片 inline 流式返回；其它类型 415。
browseRouter.get(
  '/preview',
  asyncHandler((req: Request, res: Response): void => {
    const userPath: string = typeof req.query.path === 'string' ? req.query.path : '';
    const abs = resolveSafe(FM_ROOT, userPath);
    if (!abs) {
      res.status(400).json({ code: 40001, message: '非法路径（可能越界）', data: null });
      return;
    }
    if (!fs.existsSync(abs)) {
      res.status(404).json({ code: 40400, message: '文件不存在', data: null });
      return;
    }
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      res.status(400).json({ code: 40001, message: '该路径是目录，无法预览', data: null });
      return;
    }
    const name = path.basename(abs);
    if (isImageFile(name)) {
      streamInline(abs, name, stat.size, res);
      return;
    }
    if (isTextFile(name)) {
      const content = fs.readFileSync(abs, 'utf-8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', String(Buffer.byteLength(content, 'utf-8')));
      res.send(content);
      return;
    }
    res.status(415).json({ code: 41500, message: '暂不支持预览该类型，请下载', data: null });
  })
);

// 下载：attachment 流式返回（RFC 6266 filename* 解决中文名）。
browseRouter.get(
  '/download',
  asyncHandler((req: Request, res: Response): void => {
    const userPath: string = typeof req.query.path === 'string' ? req.query.path : '';
    const abs = resolveSafe(FM_ROOT, userPath);
    if (!abs) {
      res.status(400).json({ code: 40001, message: '非法路径（可能越界）', data: null });
      return;
    }
    if (!fs.existsSync(abs)) {
      res.status(404).json({ code: 40400, message: '文件不存在', data: null });
      return;
    }
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      res.status(400).json({ code: 40001, message: '该路径是目录，无法下载', data: null });
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
