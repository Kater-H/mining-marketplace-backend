import { Router } from 'express';
import { registerUser, verifyEmail, loginUser, getCurrentUser } from '../controllers/userController.ts'; // Add .ts here
import { protect } from '../middleware/authMiddleware.ts'; // And add .ts here

const router = Router();

// Public routes
router.post('/register', registerUser);
router.get('/verify/:token', verifyEmail);
router.post('/login', loginUser);

// Protected routes
router.get('/me', protect, getCurrentUser);

export default router;