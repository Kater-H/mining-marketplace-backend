// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApplicationError } from '../utils/applicationError.js'; // Assuming this utility exists

// Extend the Request type to include a user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: 'buyer' | 'miner' | 'admin';
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; // Use environment variable for secret

/**
 * Middleware to authenticate requests using JWT.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  console.log('🔍 Auth middleware called - checking JWT token...');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ Authentication token missing or malformed.');
    return next(new ApplicationError('Authentication token missing or malformed.', 401));
  }

  const token = authHeader.split(' ')[1];
  console.log('🔍 Extracted token:', token.substring(0, 5) + '...'); // Log first few chars

  try {
    // Verify the token using the secret
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: 'buyer' | 'miner' | 'admin'; iat: number; exp: number };
    console.log('✅ JWT token verified successfully:', decoded);

    // Attach user information to the request object
    // IMPORTANT: Use 'role' (singular) as per your JWT payload
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };
    next(); // Proceed to the next middleware/route handler
  } catch (error: any) {
    console.log('❌ JWT token verification failed:', error.message);
    if (error.name === 'TokenExpiredError') {
      console.log('❌ Global Error Handler Caught: ApplicationError: Authentication token expired.');
      return next(new ApplicationError('Authentication token expired.', 401));
    }
    console.log('❌ Global Error Handler Caught: ApplicationError: Invalid authentication token.');
    return next(new ApplicationError('Invalid authentication token.', 401));
  }
};

/**
 * Middleware to authorize requests based on user roles.
 * @param allowedRoles - An array of roles that are allowed to access the route.
 */
export const authorizeRoles = (allowedRoles: Array<'buyer' | 'miner' | 'admin'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated and has a role
    if (!req.user || !req.user.role) {
      console.log('❌ Access denied: User not authenticated or role missing.');
      return next(new ApplicationError('Access denied: Authentication required.', 403));
    }

    // Check if the user's single role is included in the allowedRoles array
    // This is the line that was likely causing the error if it was trying to access roles[0]
    if (!allowedRoles.includes(req.user.role)) {
      console.log(`❌ Access denied: User role '${req.user.role}' not in allowed roles [${allowedRoles.join(', ')}].`);
      return next(new ApplicationError('Access denied: Insufficient permissions.', 403));
    }

    next(); // User has the required role, proceed
  };
};
