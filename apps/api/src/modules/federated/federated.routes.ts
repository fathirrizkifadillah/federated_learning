import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { FederatedController } from './federated.controller';

const router = Router();

/**
 * Optional auth middleware for FL delta submissions:
 * Associates anonymized contributor hash with account when logged in,
 * while still allowing privacy-safe guest browser-native FL deltas.
 */
function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as { userId: string };
      req.userId = decoded.userId;
    } catch {
      // Invalid token simply falls back to anonymous client digest
    }
  }
  next();
}

// Public / Browser-Native FL Aggregation Endpoints (Zero Raw Telemetry Enforced)
router.get('/global-model', FederatedController.getGlobalModel);
router.post('/submit-delta', optionalAuth, FederatedController.submitDelta);
router.get('/rounds', FederatedController.getRounds);

// Strictly Authenticated Zero-Knowledge E2EE Account Personalization Sync
router.get('/e2ee-profile', requireAuth, FederatedController.getE2EEProfile);
router.put('/e2ee-profile', requireAuth, FederatedController.saveE2EEProfile);
router.delete('/e2ee-profile', requireAuth, FederatedController.deleteE2EEProfile);

export default router;
