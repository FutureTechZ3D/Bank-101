import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import quizRoutes from './modules/quizzes/quiz.routes';
import adminRoutes from './modules/admin/admin.routes';
import { catalogRouter } from './modules/catalog/catalog.routes';
import { datasetRouter } from './modules/datasets/dataset.routes';
import { libraryRouter } from './modules/library/library.routes';
import { aiRouter } from './modules/ai/ai.routes';
import { institutionRouter } from './modules/institutions/institution.routes';
import { complianceRouter } from './modules/compliance/compliance.routes';
import pipelineRoutes from './pipeline/pipeline.routes';
import { corsOrigins, authRateLimitMax, isProduction } from './config/env';
import { rateLimit } from './middleware/rateLimit';

/** Builds the Express app without listening, so tests can start it on any port. */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  const allowed = corsOrigins();
  app.use(
    cors({
      // Requests without an Origin header (curl, server-to-server, same-origin) are not browser cross-site calls.
      origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)),
    })
  );
  app.use(express.json({ limit: '2mb' }));

  // Brute-force protection on the credential endpoints (POST only)
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: authRateLimitMax() });
  app.post(['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/google-oauth'], authLimiter);

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/catalog', catalogRouter);
  app.use('/api/v1/library', libraryRouter);
  app.use('/api/v1/ai', aiRouter);
  app.use('/api/v1/institutions', institutionRouter);
  app.use('/api/v1/compliance', complianceRouter);
  app.use('/api/v1', quizRoutes); // exams, subjects, quizzes, attempts, hints
  app.use('/api/v1/admin/datasets', datasetRouter);
  app.use('/api/v1/admin/pipeline', pipelineRoutes);
  app.use('/api/v1/admin', adminRoutes);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date() });
  });

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
  });

  // Global error handler: details go to the log, not to the client
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ success: false, message: 'Invalid JSON body' });
    if (err?.type === 'entity.too.large') return res.status(413).json({ success: false, message: 'Request body too large' });
    res.status(500).json({ success: false, message: isProduction() ? 'Internal Server Error' : 'Internal Server Error (see server log)' });
  });

  return app;
}
