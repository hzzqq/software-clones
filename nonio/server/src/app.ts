import express from 'express';
import cors from 'cors';
import { CORS_ORIGIN } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';
import channelsRouter from './routes/channels';
import postsRouter from './routes/posts';
import commentsRouter from './routes/comments';

/**
 * Builds and configures the Express application with shared middleware and
 * the `/api` route prefix for the Non.io community-forum clone.
 */
export const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '2mb' }));

// Mount API routes under the shared `/api` prefix.
app.use('/api', healthRouter);
app.use('/api', channelsRouter);
app.use('/api', postsRouter);
app.use('/api', commentsRouter);

// Catch-all 404 and centralized error handler (must be registered last).
app.use(notFound);
app.use(errorHandler);

export default app;
