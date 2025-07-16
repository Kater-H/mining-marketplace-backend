import { Router } from 'express';
import {
  registerUser,
  verifyUserEmail,
  loginUser,
  getUserProfile, // New import
  updateUserProfile, // New import
} from '../controllers/userController.js'; // Ensure .js
import { authenticate } from '../middleware/authMiddleware.js'; // Ensure .js

const router = Router();

router.post('/register', registerUser);
router.get('/verify-email/:token', verifyUserEmail); // Changed to param in controller
router.post('/login', loginUser);

// New: Profile routes - require authentication
router.get('/profile', authenticate, getUserProfile);
router.put('/profile', authenticate, updateUserProfile);

export const userRoutes = router;
