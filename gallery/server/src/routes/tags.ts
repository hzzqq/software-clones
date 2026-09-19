import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  listTags,
  createTag,
  tagAsset,
  untagAsset,
  getTagsForAsset,
} from '../repositories/assetRepo';
import { getAssetById } from '../repositories/assetRepo';

/**
 * 标签（Tag）REST 路由：全局标签列表 + 资源打标签 / 去标签。
 */
export const tagsRouter: Router = Router();

// 全局标签列表（含使用次数）
tagsRouter.get(
  '/tags',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listTags() });
  })
);

// 创建标签
tagsRouter.post(
  '/tags',
  asyncHandler((req: Request, res: Response): void => {
    const name: string = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      res.status(400).json({ code: 40001, message: '标签名称不能为空', data: null });
      return;
    }
    res.status(201).json({ code: 0, message: 'ok', data: createTag(name) });
  })
);

// 资源当前标签
tagsRouter.get(
  '/assets/:id/tags',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ code: 40001, message: '资源 ID 不合法', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: getTagsForAsset(id) });
  })
);

// 给资源打标签
tagsRouter.post(
  '/assets/:id/tags',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ code: 40001, message: '资源 ID 不合法', data: null });
      return;
    }
    if (!getAssetById(id)) {
      res.status(404).json({ code: 40400, message: '资源不存在', data: null });
      return;
    }
    const name: string = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      res.status(400).json({ code: 40001, message: '标签名称不能为空', data: null });
      return;
    }
    res.status(200).json({ code: 0, message: 'ok', data: tagAsset(id, name) });
  })
);

// 移除资源上的标签
tagsRouter.delete(
  '/assets/:id/tags/:tagId',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const tagId = Number(req.params.tagId);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(tagId) || tagId <= 0) {
      res.status(400).json({ code: 40001, message: 'ID 不合法', data: null });
      return;
    }
    untagAsset(id, tagId);
    res.json({ code: 0, message: 'ok', data: { ok: true } });
  })
);
