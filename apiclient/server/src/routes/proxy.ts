import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { performRequest } from '../services/proxy';
import { addHistory, pruneHistory } from '../repositories/historyRepo';
import type { ProxyRequest, HttpMethod } from '../types';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const router = Router();

router.post('/', asyncHandler(async (req, res) => {
  const body = req.body ?? {};
  const method = (METHODS as string[]).includes(body.method) ? (body.method as HttpMethod) : 'GET';
  const url = body.url ?? '';
  if (!url || !url.trim()) {
    res.status(400).json({ code: 40000, message: '缺少请求 URL', data: null });
    return;
  }
  try {
    const result = await performRequest({
      method,
      url,
      headers: body.headers,
      params: body.params,
      body: body.body,
    });
    // 记录到历史
    addHistory({
      method,
      url,
      status: result.status,
      statusText: result.statusText,
      timeMs: result.timeMs,
    });
    pruneHistory(200);
    res.json({ code: 0, message: 'ok', data: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    addHistory({ method, url, status: 0, statusText: 'ERR', timeMs: 0 });
    // 网络层错误：返回结构化结果而非 500，前端可展示
    res.json({
      code: 0,
      message: 'ok',
      data: { status: 0, statusText: 'NETWORK_ERROR', headers: {}, body: message, timeMs: 0 },
    });
  }
}));

export default router;
