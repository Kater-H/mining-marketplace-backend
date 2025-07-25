// src/middleware/authorizeMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { ApplicationError } from '../utils/applicationError.js'; // Assuming this utility exists

// REMOVED: The 'declare global' block should NOT be here if it's already in authMiddleware.ts
// or if you have a central types/express.d.ts file.
// Keeping it in one place prevents TS2717 errors.

/**
 * Middleware to authorize requests based on user roles.
 * @param allowedRoles - An array of roles that are allowed to access the route.
 */
export const authorizeRoles = (allowedRoles: Array<'buyer' | 'miner' | 'admin'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated and has a role
    // req.user is expected to be populated by the 'authenticate' middleware
    if (!req.user || !req.user.role) {
      console.log('❌ Access denied: User not authenticated or role missing.');
      return next(new ApplicationError('Access denied: Authentication required.', 403));
    }

    // Check if the user's single role is included in the allowedRoles array
    if (!allowedRoles.includes(req.user.role)) {
      console.log(`❌ Access denied: User role '${req.user.role}' not in allowed roles [${allowedRoles.join(', ')}].`);
      return next(new ApplicationError('Access denied: Insufficient permissions.', 403));
    }

    next(); // User has the required role, proceed
  };
};
