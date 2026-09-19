import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env (if present) before reading config.
dotenv.config();

/** Application configuration resolved from environment variables. */
const config = {
  // 端口由启动器运行时注入（PORT 环境变量），默认值仅作本地回退。
  port: Number(process.env.PORT ?? 4221),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5201',
  dbPath: process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.resolve(process.cwd(), 'data', 'app.db'),
};

export const PORT: number = config.port;
export const CORS_ORIGIN: string = config.corsOrigin;
export const DB_PATH: string = config.dbPath;
export default config;
