import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { FederatedService } from './federated.service';
import { validateDeltaSubmission, validateE2EEPayload } from './federated.validator';

export class FederatedController {
  static async getGlobalModel(_req: Request, res: Response, next: NextFunction) {
    try {
      const model = await FederatedService.getGlobalModel();
      res.status(200).json({ success: true, data: model });
    } catch (err) {
      next(err);
    }
  }

  static async submitDelta(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = validateDeltaSubmission(req.body || {});
      const result = await FederatedService.submitDelta(req.userId, validated);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getRounds(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 15;
      const data = await FederatedService.getRecentRounds(limit);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getE2EEProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await FederatedService.getE2EEProfile(req.userId!);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async saveE2EEProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = validateE2EEPayload(req.body || {});
      const data = await FederatedService.saveE2EEProfile(req.userId!, validated);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async deleteE2EEProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await FederatedService.deleteE2EEProfile(req.userId!);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
