import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env (if present) before reading config.
dotenv.config();

/**
 * Application configuration resolved from environment variables.
 * 端口由启动器运行时注入（PORT / CORS_ORIGIN），不要硬编码。
 */
const config = {
  port: Number(process.env.PORT ?? 4227),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5207',
  dbPath: process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.resolve(process.cwd(), 'data', 'app.db'),
  // 虚拟根目录：所有浏览 / 预览 / 下载都限定在此目录内，
  // 绝不暴露宿主机真实文件系统（如 C:\）。
  fmRoot: process.env.FM_ROOT
    ? path.resolve(process.env.FM_ROOT)
    : path.resolve(process.cwd(), 'data', 'fm-root'),
};

export const PORT: number = config.port;
export const CORS_ORIGIN: string = config.corsOrigin;
export const DB_PATH: string = config.dbPath;
export const FM_ROOT: string = config.fmRoot;
export default config;
