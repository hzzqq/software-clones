import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const config = {
  port: Number(process.env.PORT ?? 4102),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5174',
  dbPath: process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.resolve(process.cwd(), 'data', 'app.db'),
};

export const PORT: number = config.port;
export const CORS_ORIGIN: string = config.corsOrigin;
export const DB_PATH: string = config.dbPath;
export default config;
