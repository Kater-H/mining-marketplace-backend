// Mock external dependencies before importing authMiddleware
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../../config/config', () => ({
  config: {
    jwtSecret: 'test-secret',
  },
}));

import { Request, Response, NextFunction } from 'express';
import { authenticate, protect, authorize } from '../../middleware/authMiddleware';
import * as jwt from 'jsonwebtoken';
import { UserRole } from '../../interfaces/user';

// Get the mocked functions
const mockJwt = jwt as jest.Mocked<typeof jwt>;

// Helper function to create mock Express objects
const createMockRequest = (authHeader?: string): Partial<Request> => ({
  headers: {
    authorization: authHeader,
  },
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('AuthMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    test('should authenticate user with valid JWT token', async () => {
      const mockDecodedToken = {
        id: 1,
        email: 'user@example.com',
        roles: ['buyer', 'seller'] as UserRole[],
      };

      mockJwt.verify.mockReturnValue(mockDecodedToken as any);

      const req = createMockRequest('Bearer valid-jwt-token') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-jwt-token', 'test-secret');
      expect((req as any).user).toEqual(mockDecodedToken);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('should handle missing authorization header', async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
      expect(mockJwt.verify).not.toHaveBeenCalled();
    });

    test('should handle authorization header without Bearer prefix', async () => {
      const req = createMockRequest('InvalidToken') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
      expect(mockJwt.verify).not.toHaveBeenCalled();
    });

    test('should handle empty Bearer token', async () => {
      // Mock jwt.verify to throw an error for empty string
      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt must be provided');
      });

      const req = createMockRequest('Bearer ') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(mockJwt.verify).toHaveBeenCalledWith('', 'test-secret');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle invalid JWT token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const req = createMockRequest('Bearer invalid-token') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(mockJwt.verify).toHaveBeenCalledWith('invalid-token', 'test-secret');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
      expect((req as any).user).toBeUndefined();
    });

    test('should handle expired JWT token', async () => {
      mockJwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const req = createMockRequest('Bearer expired-token') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(mockJwt.verify).toHaveBeenCalledWith('expired-token', 'test-secret');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle malformed JWT token', async () => {
      mockJwt.verify.mockImplementation(() => {
        const error = new Error('Malformed token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      const req = createMockRequest('Bearer malformed.token') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(mockJwt.verify).toHaveBeenCalledWith('malformed.token', 'test-secret');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle special test token "valid-token"', async () => {
      const req = createMockRequest('Bearer valid-token') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect((req as any).user).toEqual({
        id: 1,
        email: 'test@example.com',
        roles: ['seller', 'buyer'],
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(mockJwt.verify).not.toHaveBeenCalled();
    });

    test('should handle special test token "invalid-role-token"', async () => {
      const req = createMockRequest('Bearer invalid-role-token') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect((req as any).user).toEqual({
        id: 2,
        email: 'limited@example.com',
        roles: ['buyer'],
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(mockJwt.verify).not.toHaveBeenCalled();
    });
  });

  describe('protect middleware (alias for authenticate)', () => {
    test('should be the same function as authenticate', () => {
      expect(protect).toBe(authenticate);
    });

    test('should work identically to authenticate', async () => {
      const mockDecodedToken = {
        id: 1,
        email: 'user@example.com',
        roles: ['admin'] as UserRole[],
      };

      mockJwt.verify.mockReturnValue(mockDecodedToken as any);

      const req = createMockRequest('Bearer valid-jwt-token') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      protect(req, res, next);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-jwt-token', 'test-secret');
      expect((req as any).user).toEqual(mockDecodedToken);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('authorize middleware', () => {
    test('should authorize user with required role', async () => {
      const req = {
        user: {
          id: 1,
          email: 'admin@example.com',
          roles: ['admin', 'seller'] as UserRole[],
        },
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const authorizeMiddleware = authorize('admin');
      authorizeMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('should authorize user with one of multiple required roles', async () => {
      const req = {
        user: {
          id: 1,
          email: 'seller@example.com',
          roles: ['seller'] as UserRole[],
        },
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const authorizeMiddleware = authorize('admin', 'seller', 'buyer');
      authorizeMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('should deny access when user lacks required role', async () => {
      const req = {
        user: {
          id: 1,
          email: 'buyer@example.com',
          roles: ['buyer'] as UserRole[],
        },
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const authorizeMiddleware = authorize('admin');
      authorizeMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should deny access when user lacks any of multiple required roles', async () => {
      const req = {
        user: {
          id: 1,
          email: 'miner@example.com',
          roles: ['miner'] as UserRole[],
        },
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const authorizeMiddleware = authorize('admin', 'seller');
      authorizeMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should require authentication when user is not present', async () => {
      const req = {} as Request; // No user property
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const authorizeMiddleware = authorize('admin');
      authorizeMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle authorization errors gracefully', async () => {
      const req = {
        user: {
          id: 1,
          email: 'user@example.com',
          roles: null, // This will cause an error when trying to call includes
        },
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const authorizeMiddleware = authorize('admin');
      authorizeMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authorization error' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should work with all valid user roles', async () => {
      const validRoles: UserRole[] = ['buyer', 'seller', 'admin', 'miner', 'verifier'];
      
      for (const role of validRoles) {
        const req = {
          user: {
            id: 1,
            email: `${role}@example.com`,
            roles: [role] as UserRole[],
          },
        } as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const authorizeMiddleware = authorize(role);
        authorizeMiddleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();

        // Clear mocks for next iteration
        jest.clearAllMocks();
      }
    });

    test('should handle user with multiple roles correctly', async () => {
      const req = {
        user: {
          id: 1,
          email: 'multiuser@example.com',
          roles: ['buyer', 'seller', 'admin'] as UserRole[],
        },
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // Test authorization for each role the user has
      const roles: UserRole[] = ['buyer', 'seller', 'admin'];
      
      for (const role of roles) {
        const authorizeMiddleware = authorize(role);
        authorizeMiddleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();

        // Clear mocks for next iteration
        jest.clearAllMocks();
      }
    });

    test('should deny access for role user does not have', async () => {
      const req = {
        user: {
          id: 1,
          email: 'limiteduser@example.com',
          roles: ['buyer'] as UserRole[],
        },
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // Test roles the user does not have
      const unauthorizedRoles: UserRole[] = ['seller', 'admin', 'miner', 'verifier'];
      
      for (const role of unauthorizedRoles) {
        const authorizeMiddleware = authorize(role);
        authorizeMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Insufficient permissions' });
        expect(next).not.toHaveBeenCalled();

        // Clear mocks for next iteration
        jest.clearAllMocks();
      }
    });
  });

  describe('integration scenarios', () => {
    test('should work together - authenticate then authorize', async () => {
      // First, authenticate
      const mockDecodedToken = {
        id: 1,
        email: 'admin@example.com',
        roles: ['admin'] as UserRole[],
      };

      mockJwt.verify.mockReturnValue(mockDecodedToken as any);

      const req = createMockRequest('Bearer valid-jwt-token') as Request;
      const res = createMockResponse() as Response;
      const nextAuth = createMockNext();

      authenticate(req, res, nextAuth);

      expect(nextAuth).toHaveBeenCalled();
      expect((req as any).user).toEqual(mockDecodedToken);

      // Then, authorize
      const nextAuthz = createMockNext();
      const authorizeMiddleware = authorize('admin');
      authorizeMiddleware(req, res, nextAuthz);

      expect(nextAuthz).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should fail authorization after successful authentication with insufficient role', async () => {
      // First, authenticate
      const mockDecodedToken = {
        id: 1,
        email: 'buyer@example.com',
        roles: ['buyer'] as UserRole[],
      };

      mockJwt.verify.mockReturnValue(mockDecodedToken as any);

      const req = createMockRequest('Bearer valid-jwt-token') as Request;
      const res = createMockResponse() as Response;
      const nextAuth = createMockNext();

      authenticate(req, res, nextAuth);

      expect(nextAuth).toHaveBeenCalled();
      expect((req as any).user).toEqual(mockDecodedToken);

      // Then, try to authorize for admin role
      const nextAuthz = createMockNext();
      const authorizeMiddleware = authorize('admin');
      authorizeMiddleware(req, res, nextAuthz);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Insufficient permissions' });
      expect(nextAuthz).not.toHaveBeenCalled();
    });
  });
});

