import express from 'express';
import cors from 'cors';
import { securityHeaders } from './middleware/securityHeaders';
import { CORS_ORIGIN } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';
import { notesRouter } from './routes/notes';
import { tagsRouter } from './routes/tags';
import { authRouter } from './routes/auth';
import { requireAuth } from './middleware/auth';

/**
 * Builds and configures the Express application with shared middleware and
 * the `/api` route prefix for the Memos lightweight-notes clone.
 */
export const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(securityHeaders);
app.use(express.json({ limit: '2mb' }));

// Mount API routes under the shared `/api` prefix.
app.use('/api', healthRouter);
app.use('/api', authRouter);
// 笔记与标签需要登录（鉴权在各自 router 内通过 .use(requireAuth) 施加）。
app.use('/api', notesRouter);
app.use('/api', tagsRouter);

// Catch-all 404 and centralized error handler (must be registered last).
app.use(notFound);
app.use(errorHandler);

export default app;
