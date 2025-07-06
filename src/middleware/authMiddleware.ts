import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { UserRole } from '../interfaces/user.js'; // Assuming UserRole includes 'miner'

// Interface for decoded token
interface DecodedToken {
  id: number;
  email: string;
  roles: UserRole[];
}

// Middleware to verify JWT token
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    console.log('🔍 Auth middleware called - checking JWT token...');

    const authHeader = req.headers.authorization;
    console.log('🔍 Authorization header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid Authorization header found');
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    console.log('🔍 Extracted token:', token.substring(0, 50) + '...');

    // --- FIX 1: Align Demo Admin Token ---
    // This block handles the special mock token used by the frontend for demo admin login.
    if (token === 'mock-admin-token-for-demo') {
      console.log('🔍 Using test token: mock-admin-token-for-demo');
      // Mock user for testing with 'admin' role, and also 'seller' and 'buyer' for full access
      (req as any).user = {
        id: 999, // Use a distinct ID for mock admin to avoid conflicts
        email: 'demo-admin@example.com',
        roles: ['admin', 'seller', 'buyer'] // Give admin all necessary roles for testing
      };
      next(); // Proceed to the next middleware/route handler
      return;
    }

    // Existing test tokens (optional, can be removed if not actively used for other tests)
    if (token === 'valid-token') { // This was the old demo token, can keep or remove
      console.log('🔍 Using test token: valid-token');
      (req as any).user = {
        id: 1,
        email: 'test@example.com',
        roles: ['seller', 'buyer']
      };
      next();
      return;
    }

    if (token === 'invalid-role-token') { // This was for testing insufficient permissions
      console.log('🔍 Using test token: invalid-role-token');
      (req as any).user = {
        id: 2,
        email: 'limited@example.com',
        roles: ['buyer']
      };
      next();
      return;
    }
    // --- END FIX 1 ---

    // Verify actual JWT token for regular logins
    console.log('🔍 Verifying JWT token with secret:', config.jwtSecret);
    const decoded = jwt.verify(token, config.jwtSecret) as DecodedToken;
    console.log('✅ JWT token verified successfully:', decoded);

    // Attach decoded user information to the request object
    (req as any).user = decoded;

    next(); // Proceed to the next middleware/route handler
  } catch (error) {
    console.error('❌ JWT verification failed:', error);
    // Send a 401 Unauthorized response if token is invalid or expired
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Alias for authenticate middleware (if used as 'protect' in routes)
export const protect = authenticate;

// Middleware to check user roles for authorization
export const authorize = (...roles: UserRole[]) => {
  console.log('🔍 Creating authorize middleware for roles:', roles);
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      console.log('🔍 Authorize middleware called for roles:', roles);

      // Ensure authentication has already run and populated req.user
      // The authenticate middleware is called internally, but this structure ensures it runs first.
      // If authenticate fails, it will send a response and stop execution.
      authenticate(req, res, (error?: any) => {
        if (error) {
          // If authentication failed, the authenticate middleware would have already sent a response.
          // We just return here to prevent further execution in this authorize middleware.
          console.error('❌ Authentication failed in authorize middleware:', error);
          return;
        }

        console.log('🔍 Authentication passed, checking authorization...');

        // Double-check if user object is present after authentication
        if (!(req as any).user) {
          console.log('❌ No user found on request after authentication');
          res.status(401).json({ message: 'Authentication required' });
          return;
        }

        const user = (req as any).user;
        console.log('🔍 User found:', user);

        const userRoles = user.roles as UserRole[];
        console.log('🔍 User roles:', userRoles);
        console.log('🔍 Required roles:', roles);

        // --- FIX 2: Align 'miner' role with 'seller' authorization ---
        // If the user has the 'miner' role and the route requires 'seller',
        // we effectively grant 'seller' permission to the 'miner' for this check.
        // This handles cases where your DB stores 'miner' but routes expect 'seller'.
        const effectiveUserRoles = [...userRoles]; // Create a mutable copy
        if (userRoles.includes('miner') && roles.includes('seller')) {
            if (!effectiveUserRoles.includes('seller')) { // Add 'seller' if not already present
                effectiveUserRoles.push('seller');
            }
        }
        // --- END FIX 2 ---

        // Check if the user has at least one of the required roles
        const hasRole = roles.some(role => effectiveUserRoles.includes(role)); // Use effectiveUserRoles for the check
        console.log('🔍 User has required role:', hasRole);

        if (!hasRole) {
          console.log('❌ User does not have required role');
          res.status(403).json({ message: 'Insufficient permissions' });
          return;
        }

        console.log('✅ Authorization successful');
        next(); // Proceed if authorized
      });
    } catch (error) {
      console.error('❌ Authorization error:', error);
      res.status(500).json({ message: 'Authorization error' });
    }
  };
};
