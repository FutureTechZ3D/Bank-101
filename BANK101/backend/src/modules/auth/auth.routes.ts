import { Router } from 'express';
import { register, login, logout, refreshToken, getMe, googleLogin, updateProfile } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Public
router.post('/register', register);
router.post('/login', login);
router.post('/google-oauth', googleLogin);
router.post('/refresh', refreshToken);

// Authenticated
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getMe);
router.put('/update', authMiddleware, updateProfile);

export default router;
