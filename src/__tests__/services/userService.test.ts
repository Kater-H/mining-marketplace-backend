// Mock external dependencies before importing UserService
jest.mock('bcrypt', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('../../config/database', () => ({
  getPool: jest.fn(),
}));

jest.mock('../../config/config', () => ({
  config: {
    jwtSecret: 'test-secret',
    jwtExpiresIn: '1d',
  },
}));

import UserService from '../../services/userService';
import * as bcrypt from 'bcrypt';
import { getPool } from '../../config/database';

// Get the mocked functions
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = require('jsonwebtoken');
const mockGetPool = getPool as jest.MockedFunction<typeof getPool>;

// Create mock pool
const mockPool = {
  query: jest.fn(),
};

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock pool
    mockGetPool.mockReturnValue(mockPool as any);
    
    userService = new UserService();
  });

  describe('registerUser', () => {
    const mockUserData = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123',
      roles: ['buyer'],
    };

    test('should successfully register a new user', async () => {
      // Mock email check - no existing user
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Email check
        .mockResolvedValueOnce({ // User insert
          rows: [{
            id: 1,
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            roles: ['buyer'],
          }],
        });

      // Mock bcrypt
      mockBcrypt.genSalt.mockResolvedValue('salt' as any);
      mockBcrypt.hash.mockResolvedValue('hashedPassword' as any);

      // Mock JWT
      mockJwt.sign
        .mockReturnValueOnce('auth-token') // Auth token
        .mockReturnValueOnce('verification-token'); // Verification token

      const result = await userService.registerUser(mockUserData);

      expect(result).toEqual({
        user: {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          roles: ['buyer'],
        },
        token: 'auth-token',
        verificationToken: 'verification-token',
      });

      // Verify database calls
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockBcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
    });

    test('should throw error if email already exists', async () => {
      // Mock email check - existing user found
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await expect(userService.registerUser(mockUserData)).rejects.toThrow('Email already in use');

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockBcrypt.genSalt).not.toHaveBeenCalled();
    });

    test('should use default role if no roles provided', async () => {
      const userDataWithoutRoles = { ...mockUserData };
      delete userDataWithoutRoles.roles;

      // Mock email check - no existing user
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            roles: ['buyer'],
          }],
        });

      mockBcrypt.genSalt.mockResolvedValue('salt' as any);
      mockBcrypt.hash.mockResolvedValue('hashedPassword' as any);
      mockJwt.sign.mockReturnValue('token');

      await userService.registerUser(userDataWithoutRoles);

      // Verify default role was used
      expect(mockPool.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO users'), [
        'John',
        'Doe',
        'john.doe@example.com',
        'hashedPassword',
        ['buyer'], // Default role
      ]);
    });

    test('should handle database errors during registration', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(userService.registerUser(mockUserData)).rejects.toThrow('Database connection failed');
    });

    test('should handle bcrypt errors', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockBcrypt.genSalt.mockRejectedValueOnce(new Error('Bcrypt error'));

      await expect(userService.registerUser(mockUserData)).rejects.toThrow('Bcrypt error');
    });
  });

  describe('verifyEmail', () => {
    test('should successfully verify email with valid token', async () => {
      const token = 'valid-token';
      const decodedToken = { email: 'john.doe@example.com' };

      mockJwt.verify.mockReturnValue(decodedToken);
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const result = await userService.verifyEmail(token);

      expect(result).toBe(true);
      expect(mockJwt.verify).toHaveBeenCalledWith(token, 'test-secret');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['john.doe@example.com']
      );
    });

    test('should return false for invalid token', async () => {
      const token = 'invalid-token';

      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await userService.verifyEmail(token);

      expect(result).toBe(false);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('should return false if decoded token has no email', async () => {
      const token = 'token-without-email';

      mockJwt.verify.mockReturnValue({});

      const result = await userService.verifyEmail(token);

      expect(result).toBe(false);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('should return false if user not found in database', async () => {
      const token = 'valid-token';
      const decodedToken = { email: 'nonexistent@example.com' };

      mockJwt.verify.mockReturnValue(decodedToken);
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await userService.verifyEmail(token);

      expect(result).toBe(false);
    });

    test('should handle database errors during verification', async () => {
      const token = 'valid-token';
      const decodedToken = { email: 'john.doe@example.com' };

      mockJwt.verify.mockReturnValue(decodedToken);
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await userService.verifyEmail(token);

      expect(result).toBe(false);
    });
  });

  describe('loginUser', () => {
    const email = 'john.doe@example.com';
    const password = 'password123';
    const mockUser = {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      password: 'hashedPassword',
      roles: ['buyer'],
    };

    test('should successfully login user with valid credentials', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      mockBcrypt.compare.mockResolvedValue(true as any);
      mockJwt.sign.mockReturnValue('auth-token');

      const result = await userService.loginUser(email, password);

      expect(result).toEqual({
        user: {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          roles: ['buyer'],
        },
        token: 'auth-token',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, first_name, last_name, email, password, roles'),
        [email]
      );
      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, 'hashedPassword');
      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          id: 1,
          email: 'john.doe@example.com',
          roles: ['buyer'],
        },
        'test-secret',
        { expiresIn: '1d' }
      );
    });

    test('should throw error for non-existent user', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(userService.loginUser(email, password)).rejects.toThrow('Invalid credentials');

      expect(mockBcrypt.compare).not.toHaveBeenCalled();
      expect(mockJwt.sign).not.toHaveBeenCalled();
    });

    test('should throw error for invalid password', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      mockBcrypt.compare.mockResolvedValue(false as any);

      await expect(userService.loginUser(email, password)).rejects.toThrow('Invalid credentials');

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, 'hashedPassword');
      expect(mockJwt.sign).not.toHaveBeenCalled();
    });

    test('should handle database errors during login', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(userService.loginUser(email, password)).rejects.toThrow('Database connection failed');
    });

    test('should handle bcrypt comparison errors', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      mockBcrypt.compare.mockRejectedValueOnce(new Error('Bcrypt comparison failed'));

      await expect(userService.loginUser(email, password)).rejects.toThrow('Bcrypt comparison failed');
    });
  });

  describe('getUserById', () => {
    const userId = 1;
    const mockUser = {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      roles: ['buyer'],
    };

    test('should successfully get user by ID', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await userService.getUserById(userId);

      expect(result).toEqual(mockUser);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, first_name, last_name, email, roles'),
        [userId]
      );
    });

    test('should return null for non-existent user', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await userService.getUserById(userId);

      expect(result).toBeNull();
    });

    test('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(userService.getUserById(userId)).rejects.toThrow('Database error');
    });
  });

  describe('updateUser', () => {
    const userId = 1;
    const updateData = {
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com',
    };

    test('should successfully update user', async () => {
      const updatedUser = {
        id: 1,
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        roles: ['buyer'],
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // User exists check
        .mockResolvedValueOnce({ rows: [] }) // Email uniqueness check
        .mockResolvedValueOnce({ rows: [updatedUser] }); // Update query

      const result = await userService.updateUser(userId, updateData);

      expect(result).toEqual(updatedUser);
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    test('should throw error if user not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(userService.updateUser(userId, updateData)).rejects.toThrow('User not found');

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    test('should throw error if email already in use by another user', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // User exists
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }); // Email in use by another user

      await expect(userService.updateUser(userId, updateData)).rejects.toThrow('Email already in use');

      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    test('should hash password when updating password', async () => {
      const updateDataWithPassword = {
        ...updateData,
        password: 'newPassword123',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // User exists
        .mockResolvedValueOnce({ rows: [] }) // Email uniqueness check
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Update query

      mockBcrypt.genSalt.mockResolvedValue('salt' as any);
      mockBcrypt.hash.mockResolvedValue('hashedNewPassword' as any);

      await userService.updateUser(userId, updateDataWithPassword);

      expect(mockBcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newPassword123', 'salt');
    });

    test('should return message when no fields to update', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const result = await userService.updateUser(userId, {});

      expect(result).toEqual({ message: 'No fields to update' });
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    test('should handle database errors during update', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(userService.updateUser(userId, updateData)).rejects.toThrow('Database error');
    });

    test('should update roles when provided', async () => {
      const updateDataWithRoles = {
        first_name: 'Jane',
        roles: ['seller', 'buyer'],
      };

      const updatedUser = {
        id: 1,
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        roles: ['seller', 'buyer'],
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // User exists check
        .mockResolvedValueOnce({ rows: [updatedUser] }); // Update query

      const result = await userService.updateUser(userId, updateDataWithRoles);

      expect(result).toEqual(updatedUser);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      
      // Verify the update query was called with correct parameters
      expect(mockPool.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('UPDATE users SET first_name = $1, roles = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3'),
        ['Jane', ['seller', 'buyer'], 1]
      );
    });
  });

  describe('constructor', () => {
    test('should use provided pool when userModel is passed', () => {
      const customPool = { query: jest.fn() };
      const userModel = { pool: customPool };

      const service = new UserService(userModel);

      // Access private pool property for testing
      expect((service as any).pool).toBe(customPool);
    });

    test('should use getPool when no userModel is provided', () => {
      const service = new UserService();

      expect(mockGetPool).toHaveBeenCalled();
      expect((service as any).pool).toBe(mockPool);
    });
  });
});

