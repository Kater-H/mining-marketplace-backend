// src/routes/userRoutes.ts
import { Router } from 'express';
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  setUserComplianceStatus,
  getAllUsers, // <-- NEW: Import getAllUsers controller function
} from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authorizeMiddleware.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

// All routes below this will require authentication
router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Admin-only route to set user compliance status
router.put('/compliance/:userId/status', authorizeRoles(['admin']), setUserComplianceStatus);

// NEW: Admin-only route to get all users
router.get('/', authorizeRoles(['admin']), getAllUsers); // <-- NEW ROUTE

// Export as named export for app.ts
export const userRoutes = router;
