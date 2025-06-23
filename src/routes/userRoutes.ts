import { Router } from 'express';
import { registerUser, verifyEmail, loginUser, getCurrentUser } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.post('/register', registerUser);
router.get('/verify/:token', verifyEmail);
router.post('/login', loginUser);

// Protected routes
router.get('/me', protect, getCurrentUser);

export default router;
