import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env (if present) before reading config.
dotenv.config();

/** 默认单文件大小上限：50MB。 */
export const DEFAULT_MAX_FILE_SIZE: number = 50 * 1024 * 1024;

function resolveFromCwd(value: string | undefined, fallback: string): string {
  return value ? path.resolve(value) : path.resolve(process.cwd(), fallback);
}

/** Application configuration resolved from environment variables. */
const config = {
  port: Number(process.env.PORT ?? 4219),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5199',
  dbPath: process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.resolve(process.cwd(), 'data', 'app.db'),
  uploadDir: process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(process.cwd(), 'data', 'uploads'),
  maxFileSize: Number(process.env.MAX_FILE_SIZE ?? DEFAULT_MAX_FILE_SIZE),
};

export const PORT: number = config.port;
export const CORS_ORIGIN: string = config.corsOrigin;
export const DB_PATH: string = config.dbPath;
export const UPLOAD_DIR: string = config.uploadDir;
export const MAX_FILE_SIZE: number = config.maxFileSize;
export default config;
