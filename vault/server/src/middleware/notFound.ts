import { Request, Response, NextFunction } from 'express';

export function notFound(_req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({
    code: 40400,
    message: '资源不存在',
    data: null,
  });
}
