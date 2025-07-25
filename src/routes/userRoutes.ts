// src/routes/userRoutes.ts
import { Router } from 'express';
// ... other imports for userController functions, middleware, etc. ...
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  setUserComplianceStatus,
  getAllUsers,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authorizeMiddleware.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

router.use(authenticate); // Apply authentication middleware to all routes below this

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

router.put('/compliance/:userId/status', authorizeRoles(['admin']), setUserComplianceStatus);
router.get('/', authorizeRoles(['admin']), getAllUsers);

// Export the router as a named export
export { router }; // <--- THIS LINE IS CRUCIAL AND MUST BE PRESENT
