// src/routes/userRoutes.ts
import { Router } from 'express';
import {
  registerUser,
  // verifyUserEmail, // Removed
  loginUser,
  getUserProfile,
  updateUserProfile,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', registerUser);
// router.get('/verify-email/:token', verifyUserEmail); // Removed
router.post('/login', loginUser);

router.get('/profile', authenticate, getUserProfile);
router.put('/profile', authenticate, updateUserProfile);

export const userRoutes = router;
