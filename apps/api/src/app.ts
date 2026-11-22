import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import authRoutes from './modules/auth/auth.routes';
import postsRoutes from './modules/posts/posts.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import modelsRoutes from './modules/models/models.routes';
import clientsRoutes from './modules/clients/clients.routes';
import { errorHandler } from './middleware/error';

export const app = express();

app.use(
  cors({
    origin: ENV.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());

// Privacy Guard Middleware: Explicitly blocks any telemetry upload attempts to central server
app.use('/api/v1/events', (req: Request, res: Response) => {
  return res.status(403).json({
    error: 'PRIVACY_VIOLATION_BLOCKED',
    message:
      'Centralized event tracking is strictly forbidden under FedSocial V2 Privacy by Design architecture. All behavioral signals must remain in local browser IndexedDB or edge SQLite.',
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'fedsocial-api',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/posts', postsRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/models', modelsRoutes);
app.use('/api/v1/clients', clientsRoutes);

// Error Handling
app.use(errorHandler);
