import express from 'express';
import cors from 'cors';
import { securityHeaders } from './middleware/securityHeaders';
import { CORS_ORIGIN } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';
import { roomsRouter } from './routes/rooms';
import { messagesRouter } from './routes/messages';
import { streamRouter } from './routes/stream';

export const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(securityHeaders);
app.use(express.json({ limit: '2mb' }));

app.use('/api', healthRouter);
app.use('/api', roomsRouter);
// 消息与 SSE 流路由挂在 /api/rooms 下，使其完整路径为
// /api/rooms/:id/messages 与 /api/rooms/:id/stream，与客户端 API 调用对齐。
app.use('/api/rooms', messagesRouter);
app.use('/api/rooms', streamRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
