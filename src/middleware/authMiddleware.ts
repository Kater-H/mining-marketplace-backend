// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { ApplicationError } from '../utils/applicationError.js';

// Extend the Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: 'buyer' | 'miner' | 'admin'; // Directly use literal types
        email: string;
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  console.log('🔍 Auth middleware called - checking JWT token...');
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('❌ No token provided.');
    return next(new ApplicationError('Authentication token required.', 401));
  }

  console.log('🔍 Authorization header:', authHeader);
  console.log('🔍 Extracted token:', token.substring(0, 5) + '...'); // Log first 5 chars for debugging

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      console.log('❌ JWT token verification failed:', err.message);
      // Handle specific JWT errors
      if (err.name === 'TokenExpiredError') {
        return next(new ApplicationError('Authentication token expired.', 401));
      }
      return next(new ApplicationError('Invalid authentication token.', 403));
    }

    // Ensure user object matches the expected structure
    const decodedUser = user as { id: number; email: string; roles: Array<'buyer' | 'miner' | 'admin'> };
    console.log('✅ JWT token verified successfully:', decodedUser);

    // Attach user information to the request object
    req.user = {
      id: decodedUser.id,
      email: decodedUser.email,
      role: decodedUser.roles[0], // Assuming single role for simplicity
    };
    next();
  });
};
