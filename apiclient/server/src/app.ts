import express from 'express';
import cors from 'cors';
import { securityHeaders } from './middleware/securityHeaders';
import { CORS_ORIGIN } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';
import proxyRouter from './routes/proxy';
import requestsRouter from './routes/requests';
import historyRouter from './routes/history';

/**
 * Builds and configures the Express application with shared middleware and
 * the `/api` route prefix for the Web API client (Hoppscotch-core) clone.
 * The `/proxy` route forwards requests server-side to bypass browser CORS.
 */
export const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(securityHeaders);
app.use(express.json({ limit: '2mb' }));

// Mount API routes under the shared `/api` prefix.
app.use('/api', healthRouter);
app.use('/api', proxyRouter);
app.use('/api', requestsRouter);
app.use('/api', historyRouter);

// Catch-all 404 and centralized error handler (must be registered last).
app.use(notFound);
app.use(errorHandler);

export default app;
