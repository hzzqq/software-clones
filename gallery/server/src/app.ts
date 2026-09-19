import express from 'express';
import cors from 'cors';
import { securityHeaders } from './middleware/securityHeaders';
import { CORS_ORIGIN } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';
import { assetsRouter } from './routes/assets';
import { albumsRouter } from './routes/albums';
import { tagsRouter } from './routes/tags';

/**
 * Builds and configures the Express application with shared middleware and
 * the `/api` route prefix.
 */
export const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
// 安全响应头必须在路由注册之前生效。
app.use(securityHeaders);
app.use(express.json({ limit: '2mb' }));

// Mount API routes under the shared `/api` prefix.
app.use('/api', healthRouter);
app.use('/api', assetsRouter);
app.use('/api', albumsRouter);
app.use('/api', tagsRouter);

// Catch-all 404 and centralized error handler (must be registered last).
app.use(notFound);
app.use(errorHandler);

export default app;
