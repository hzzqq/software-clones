import { ErrorRequestHandler } from 'express';

export interface ApiErrorShape {
  code: number;
  message: string;
  data: null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next): void => {
  const status: number = err.status ?? 500;
  const code: number = err.code ?? 50000;
  const message: string = err.message ?? '服务器内部错误';
  console.error('[errorHandler]', err);
  const body: ApiErrorShape = { code, message, data: null };
  res.status(status).json(body);
};
