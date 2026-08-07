import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const config = {
  port: Number(process.env.PORT ?? 4215),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5195',
  dbPath: process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.resolve(process.cwd(), 'data', 'app.db'),
  /** 加密密钥（可选）：配置后按 SHA-256 派生；未配置则首次启动生成随机密钥文件。 */
  secret: process.env.SECRET ?? '',
  /** 密钥文件所在目录（默认与 DB 同级 data/ 目录）。 */
  dataDir: process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(process.cwd(), 'data'),
};

export const PORT: number = config.port;
export const CORS_ORIGIN: string = config.corsOrigin;
export const DB_PATH: string = config.dbPath;
export const SECRET: string = config.secret;
export const DATA_DIR: string = config.dataDir;
export default config;
