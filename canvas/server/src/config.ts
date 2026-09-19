import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env (if present) before reading config.
dotenv.config();

/** Application configuration resolved from environment variables. */
const config = {
  port: Number(process.env.PORT ?? 4223),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5203',
  dbPath: process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.resolve(process.cwd(), 'data', 'app.db'),
  uploadDir: process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(process.cwd(), 'data', 'uploads'),
};

export const PORT: number = config.port;
export const CORS_ORIGIN: string = config.corsOrigin;
export const DB_PATH: string = config.dbPath;
export const UPLOAD_DIR: string = config.uploadDir;
export default config;
