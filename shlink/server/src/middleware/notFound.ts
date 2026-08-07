import { Request, Response, NextFunction } from 'express';

/**
 * 404 handler. Any request that reaches this middleware has not matched a route
 * and is reported using the unified error envelope (code 40400).
 */
export function notFound(_req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({
    code: 40400,
    message: '资源不存在',
    data: null,
  });
}
