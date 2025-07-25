// src/routes/authRoutes.ts
import { Router } from 'express';
// Import the authentication controller functions
import { registerUser, loginUser } from '../controllers/userController.js'; // Ensure .js is here

const router = Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', registerUser);

/**
 * @route POST /api/auth/login
 * @desc Authenticate user & get token
 * @access Public
 */
router.post('/login', loginUser);

// Export the router as a named export to be consistent with app.ts
export { router };
