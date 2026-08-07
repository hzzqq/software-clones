import { ErrorRequestHandler } from 'express';

export interface ApiErrorShape {
  code: number;
  message: string;
  data: null;
}

/**
 * Centralized error handler. Converts any thrown error into the unified
 * `{ code, message, data: null }` envelope. Defaults to HTTP 500 / code 50000.
 *
 * 额外映射 body-parser 的 413「请求体过大」（express.raw limit 触发）为
 * 面向用户的文件大小提示。
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next): void => {
  if (err && err.status === 413) {
    const body: ApiErrorShape = {
      code: 41300,
      message: '上传文件超过大小限制，请压缩后重试',
      data: null,
    };
    res.status(413).json(body);
    return;
  }
  const status: number = err.status ?? 500;
  const code: number = err.code ?? 50000;
  const message: string = err.message ?? '服务器内部错误';
  console.error('[errorHandler]', err);
  const body: ApiErrorShape = { code, message, data: null };
  res.status(status).json(body);
};
