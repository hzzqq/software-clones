import { Request, Response, NextFunction } from 'express';

/**
 * 轻量安全响应头（无需额外依赖，等价于 helmet 的核心防护）：
 *  - X-Content-Type-Options: nosniff 防止 MIME 嗅探引发的 XSS
 *  - X-Frame-Options: DENY 防止被 iframe 嵌套（点击劫持）
 *  - Referrer-Policy: no-referrer 减少请求头泄露来源信息
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
}
