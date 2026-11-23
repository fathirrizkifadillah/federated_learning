import { Router } from 'express';
import { AuthController } from './auth.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', requireAuth, AuthController.me);
router.patch('/profile', requireAuth, AuthController.updateProfile);
router.post('/change-password', requireAuth, AuthController.changePassword);

export default router;
