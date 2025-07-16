    // src/routes/userRoutes.ts
    import { Router } from 'express';
    import {
      registerUser,
      verifyUserEmail,
      loginUser,
      getUserProfile,
      updateUserProfile,
    } from '../controllers/userController.js';
    import { authenticate } from '../middleware/authMiddleware.js'; // Ensure .js is here

    const router = Router();

    router.post('/register', registerUser);
    router.get('/verify-email/:token', verifyUserEmail); // Changed to use URL parameter
    router.post('/login', loginUser);

    // Profile routes - require authentication
    router.get('/profile', authenticate, getUserProfile);
    router.put('/profile', authenticate, updateUserProfile);

    export const userRoutes = router;
    