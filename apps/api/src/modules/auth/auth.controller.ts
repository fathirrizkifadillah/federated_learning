import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from '../../middleware/auth';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, username, password } = req.body;
      if (!email || !username || !password) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Email, username, and password are required.' });
      }
      const result = await AuthService.register(email, username, password);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Email and password are required.' });
      }
      const result = await AuthService.login(email, password);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.getProfile(req.userId!);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
