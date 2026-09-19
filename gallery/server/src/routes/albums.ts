import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  createAlbum,
  getAlbum,
  listAlbums,
  renameAlbum,
  deleteAlbum,
  addAssetToAlbum,
  removeAssetFromAlbum,
  listAssetsInAlbum,
} from '../repositories/assetRepo';

/**
 * 相册（Album）REST 路由：CRUD + 资源加入/移出 + 资源列表。
 */
export const albumsRouter: Router = Router();

// 创建相册
albumsRouter.post(
  '/albums',
  asyncHandler((req: Request, res: Response): void => {
    const name: string = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      res.status(400).json({ code: 40001, message: '相册名称不能为空', data: null });
      return;
    }
    res.status(201).json({ code: 0, message: 'ok', data: createAlbum(name) });
  })
);

// 列表
albumsRouter.get(
  '/albums',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listAlbums() });
  })
);

// 单个相册
albumsRouter.get(
  '/albums/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ code: 40001, message: '相册 ID 不合法', data: null });
      return;
    }
    const album = getAlbum(id);
    if (!album) {
      res.status(404).json({ code: 40400, message: '相册不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: album });
  })
);

// 重命名
albumsRouter.patch(
  '/albums/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ code: 40001, message: '相册 ID 不合法', data: null });
      return;
    }
    const name: string = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      res.status(400).json({ code: 40001, message: '相册名称不能为空', data: null });
      return;
    }
    const album = renameAlbum(id, name);
    if (!album) {
      res.status(404).json({ code: 40400, message: '相册不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: album });
  })
);

// 删除相册（级联移除 album_assets 关系）
albumsRouter.delete(
  '/albums/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ code: 40001, message: '相册 ID 不合法', data: null });
      return;
    }
    if (!deleteAlbum(id)) {
      res.status(404).json({ code: 40400, message: '相册不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: { ok: true } });
  })
);

// 相册内的资源列表
albumsRouter.get(
  '/albums/:id/assets',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ code: 40001, message: '相册 ID 不合法', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: listAssetsInAlbum(id) });
  })
);

// 加入资源（支持单个 assetId 或 assetIds 数组）
albumsRouter.post(
  '/albums/:id/assets',
  asyncHandler((req: Request, res: Response): void => {
    const albumId = Number(req.params.id);
    if (!Number.isInteger(albumId) || albumId <= 0) {
      res.status(400).json({ code: 40001, message: '相册 ID 不合法', data: null });
      return;
    }
    const ids: number[] = [];
    if (Array.isArray(req.body?.assetIds)) {
      for (const v of req.body.assetIds) {
        const n = Number(v);
        if (Number.isInteger(n)) ids.push(n);
      }
    } else if (req.body?.assetId != null) {
      const n = Number(req.body.assetId);
      if (Number.isInteger(n)) ids.push(n);
    }
    if (ids.length === 0) {
      res.status(400).json({ code: 40001, message: '请提供至少一个资源 ID', data: null });
      return;
    }
    for (const assetId of ids) {
      addAssetToAlbum(albumId, assetId);
    }
    res.json({ code: 0, message: 'ok', data: { added: ids.length } });
  })
);

// 移出资源
albumsRouter.delete(
  '/albums/:id/assets/:assetId',
  asyncHandler((req: Request, res: Response): void => {
    const albumId = Number(req.params.id);
    const assetId = Number(req.params.assetId);
    if (!Number.isInteger(albumId) || albumId <= 0 || !Number.isInteger(assetId) || assetId <= 0) {
      res.status(400).json({ code: 40001, message: 'ID 不合法', data: null });
      return;
    }
    removeAssetFromAlbum(albumId, assetId);
    res.json({ code: 0, message: 'ok', data: { ok: true } });
  })
);
