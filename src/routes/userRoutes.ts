import { Router } from 'express';
import {
  registerUser,
  verifyUserEmail,
  loginUser,
  getUserProfile,
  updateUserProfile
} from '../controllers/userController'; // Removed .ts
import { authenticate } from '../middleware/authMiddleware'; // Removed .ts

const router = Router();

// Public routes
router.post('/register', registerUser);
router.get('/verify-email', verifyUserEmail);
router.post('/login', loginUser);

// Authenticated routes
router.use(authenticate); // Apply authentication to all routes below this point

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);


export const userRoutes = router;
