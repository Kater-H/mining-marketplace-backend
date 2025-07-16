// src/routes/userRoutes.ts
import { Router } from 'express';
import {
  registerUser,
  loginUser,
  getProfile, // Corrected import name
  updateProfile, // Corrected import name
  setUserComplianceStatus, 
} from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authorizeMiddleware.js'; 

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

// All routes below this will require authentication
router.use(authenticate);

router.get('/profile', getProfile); // Use getProfile
router.put('/profile', updateProfile); // Use updateProfile

// Admin-only route to set user compliance status
router.put('/compliance/:userId/status', authorizeRoles(['admin']), setUserComplianceStatus);

// Export as named export for app.ts
export const userRoutes = router;
