import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env (if present) before reading config.
dotenv.config();

/** 默认每个房间最多保留的消息条数。 */
export const DEFAULT_MAX_MESSAGES_PER_ROOM: number = 500;

/** Application configuration resolved from environment variables. */
const config = {
  port: Number(process.env.PORT ?? 4220),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5200',
  dbPath: process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.resolve(process.cwd(), 'data', 'app.db'),
  maxMessagesPerRoom: Number(
    process.env.MAX_MESSAGES_PER_ROOM ?? DEFAULT_MAX_MESSAGES_PER_ROOM
  ),
};

export const PORT: number = config.port;
export const CORS_ORIGIN: string = config.corsOrigin;
export const DB_PATH: string = config.dbPath;
export const MAX_MESSAGES_PER_ROOM: number = config.maxMessagesPerRoom;
export default config;
