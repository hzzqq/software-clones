import express from 'express';
import cors from 'cors';
import { securityHeaders } from './middleware/securityHeaders';
import { CORS_ORIGIN, UPLOAD_DIR } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';
import { canvasesRouter } from './routes/canvases';
import { nodesRouter } from './routes/nodes';
import { edgesRouter } from './routes/edges';
import { uploadsRouter } from './routes/uploads';

/**
 * Builds and configures the Express application for the Canvas (无限画布) clone.
 */
export const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(securityHeaders);
app.use(express.json({ limit: '2mb' }));

// Mount API routes under the shared `/api` prefix.
app.use('/api', healthRouter);
app.use('/api', canvasesRouter);
app.use('/api', nodesRouter);
app.use('/api', edgesRouter);
app.use('/api', uploadsRouter);
// 公开访问已上传的图片节点。
app.use('/api/uploads', express.static(UPLOAD_DIR));

// Catch-all 404 and centralized error handler (must be registered last).
app.use(notFound);
app.use(errorHandler);

export default app;
