// src/middleware/authorizeMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { ApplicationError } from '../utils/applicationError.js'; // Ensure .js extension

// Extend the Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: 'buyer' | 'miner' | 'admin';
        email: string;
      };
    }
  }
}

/**
 * Middleware to authorize users based on their roles.
 * @param allowedRoles An array of roles that are permitted to access the route.
 */
export const authorizeRoles = (allowedRoles: Array<'buyer' | 'miner' | 'admin'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated (req.user should be set by authenticate middleware)
    if (!req.user) {
      return next(new ApplicationError('Authentication required.', 401));
    }

    // Check if the user's role is included in the allowedRoles
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApplicationError('Forbidden: You do not have the necessary permissions.', 403));
    }

    // If authorized, proceed to the next middleware/route handler
    next();
  };
};
