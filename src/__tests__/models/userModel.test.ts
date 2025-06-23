// Mock external dependencies before importing userModel
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('../../config/database', () => ({
  pgPool: {
    connect: jest.fn(),
    query: jest.fn(),
  },
}));

import { UserModel, CreateUserData, UpdateUserData, User } from '../../models/userModel';
import { pgPool } from '../../config/database';

// Get the mocked functions
const mockPgPool = pgPool as jest.Mocked<typeof pgPool>;

describe('UserModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default database connection mock
    mockPgPool.connect.mockResolvedValue(mockClient as any);
  });

  describe('findByEmail', () => {
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'miner',
      first_name: 'John',
      last_name: 'Doe',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      email_verified: false,
    };

    test('should find user by email successfully', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [mockUser] } as any);

      const result = await UserModel.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
    });

    test('should return null when user not found', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await UserModel.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
      expect(mockPgPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['nonexistent@example.com']
      );
    });

    test('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(UserModel.findByEmail('test@example.com')).rejects.toThrow('Database connection failed');
    });
  });

  describe('findById', () => {
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'buyer',
      first_name: 'Jane',
      last_name: 'Smith',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      email_verified: true,
    };

    test('should find user by ID successfully', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [mockUser] } as any);

      const result = await UserModel.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1]
      );
    });

    test('should return null when user not found', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await UserModel.findById(999);

      expect(result).toBeNull();
    });

    test('should handle database errors', async () => {
      const error = new Error('User not found');
      mockPgPool.query.mockRejectedValue(error);

      await expect(UserModel.findById(1)).rejects.toThrow('User not found');
    });
  });

  describe('findByVerificationToken', () => {
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'miner',
      first_name: 'John',
      last_name: 'Doe',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      email_verified: false,
      verification_token: 'valid_token_123',
      verification_token_expires: new Date('2024-12-31'),
    };

    test('should find user by verification token successfully', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [mockUser] } as any);

      const result = await UserModel.findByVerificationToken('valid_token_123');

      expect(result).toEqual(mockUser);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE verification_token = $1 AND verification_token_expires > NOW()',
        ['valid_token_123']
      );
    });

    test('should return null when token not found or expired', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await UserModel.findByVerificationToken('expired_token');

      expect(result).toBeNull();
    });

    test('should handle database errors', async () => {
      const error = new Error('Database query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(UserModel.findByVerificationToken('token')).rejects.toThrow('Database query failed');
    });
  });

  describe('findByResetToken', () => {
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'buyer',
      first_name: 'Jane',
      last_name: 'Smith',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      email_verified: true,
      reset_password_token: 'reset_token_456',
      reset_password_expires: new Date('2024-12-31'),
    };

    test('should find user by reset token successfully', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [mockUser] } as any);

      const result = await UserModel.findByResetToken('reset_token_456');

      expect(result).toEqual(mockUser);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
        ['reset_token_456']
      );
    });

    test('should return null when reset token not found or expired', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await UserModel.findByResetToken('invalid_token');

      expect(result).toBeNull();
    });

    test('should handle database errors', async () => {
      const error = new Error('Reset token query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(UserModel.findByResetToken('token')).rejects.toThrow('Reset token query failed');
    });
  });

  describe('create', () => {
    const mockUserData: CreateUserData = {
      email: 'newuser@example.com',
      password: 'hashedpassword123',
      role: 'miner',
      first_name: 'New',
      last_name: 'User',
      verification_token: 'verification_token_789',
      verification_token_expires: new Date('2024-12-31'),
    };

    const mockCreatedUser: User = {
      id: 2,
      ...mockUserData,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      email_verified: false,
    };

    test('should create user successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCreatedUser] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await UserModel.create(mockUserData);

      expect(result).toEqual(mockCreatedUser);
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Duplicate email');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // INSERT fails

      await expect(UserModel.create(mockUserData)).rejects.toThrow('Duplicate email');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should create user with minimal data', async () => {
      const minimalUserData: CreateUserData = {
        email: 'minimal@example.com',
        password: 'hashedpassword',
        role: 'buyer',
      };

      const mockMinimalUser: User = {
        id: 3,
        ...minimalUserData,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        email_verified: false,
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockMinimalUser] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await UserModel.create(minimalUserData);

      expect(result).toEqual(mockMinimalUser);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO users'), [
        'minimal@example.com',
        'hashedpassword',
        'buyer',
        null,
        null,
        null,
        null
      ]);
    });
  });

  describe('update', () => {
    const mockUpdateData: UpdateUserData = {
      first_name: 'Updated',
      last_name: 'Name',
      email_verified: true,
    };

    const mockUpdatedUser: User = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'miner',
      first_name: 'Updated',
      last_name: 'Name',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02'),
      email_verified: true,
    };

    test('should update user successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUpdatedUser] }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await UserModel.update(1, mockUpdateData);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should return null when user not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns no rows
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await UserModel.update(999, mockUpdateData);

      expect(result).toBeNull();
    });

    test('should handle empty update data', async () => {
      await expect(UserModel.update(1, {})).rejects.toThrow('No fields to update');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Update failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // UPDATE fails

      await expect(UserModel.update(1, mockUpdateData)).rejects.toThrow('Update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should update single field', async () => {
      const singleFieldUpdate = { email_verified: true };
      
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUpdatedUser] }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await UserModel.update(1, singleFieldUpdate);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('email_verified = $1'),
        [true, 1]
      );
    });
  });

  describe('delete', () => {
    test('should delete user successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1 }) // DELETE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await UserModel.delete(1);

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 'DELETE FROM users WHERE id = $1', [1]);
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should return false when user not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rowCount: 0 }) // DELETE returns 0 rows
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await UserModel.delete(999);

      expect(result).toBe(false);
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Delete failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // DELETE fails

      await expect(UserModel.delete(1)).rejects.toThrow('Delete failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle null rowCount', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rowCount: null }) // DELETE returns null rowCount
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await UserModel.delete(1);

      expect(result).toBe(false);
    });
  });

  describe('updateVerificationStatus', () => {
    const mockVerifiedUser: User = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'miner',
      first_name: 'John',
      last_name: 'Doe',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02'),
      email_verified: true,
    };

    test('should update verification status successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockVerifiedUser] }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await UserModel.updateVerificationStatus(1, true);

      expect(result).toEqual(mockVerifiedUser);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('email_verified = $1'),
        [true, 1]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should return null when user not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns no rows
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await UserModel.updateVerificationStatus(999, true);

      expect(result).toBeNull();
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Verification update failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // UPDATE fails

      await expect(UserModel.updateVerificationStatus(1, true)).rejects.toThrow('Verification update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updatePassword', () => {
    const mockUserWithNewPassword: User = {
      id: 1,
      email: 'test@example.com',
      password: 'newhashed password',
      role: 'buyer',
      first_name: 'Jane',
      last_name: 'Smith',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02'),
      email_verified: true,
    };

    test('should update password successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUserWithNewPassword] }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await UserModel.updatePassword(1, 'newhashed password');

      expect(result).toEqual(mockUserWithNewPassword);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('password = $1'),
        ['newhashed password', 1]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should return null when user not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns no rows
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await UserModel.updatePassword(999, 'newpassword');

      expect(result).toBeNull();
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Password update failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // UPDATE fails

      await expect(UserModel.updatePassword(1, 'newpassword')).rejects.toThrow('Password update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('setResetPasswordToken', () => {
    const mockUserWithResetToken: User = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'miner',
      first_name: 'John',
      last_name: 'Doe',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02'),
      email_verified: true,
      reset_password_token: 'reset_token_123',
      reset_password_expires: new Date('2024-12-31'),
    };

    test('should set reset password token successfully', async () => {
      const expires = new Date('2024-12-31');
      
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUserWithResetToken] }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await UserModel.setResetPasswordToken(1, 'reset_token_123', expires);

      expect(result).toEqual(mockUserWithResetToken);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('reset_password_token = $1'),
        ['reset_token_123', expires, 1]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should return null when user not found', async () => {
      const expires = new Date('2024-12-31');
      
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns no rows
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await UserModel.setResetPasswordToken(999, 'token', expires);

      expect(result).toBeNull();
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Reset token update failed');
      const expires = new Date('2024-12-31');
      
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // UPDATE fails

      await expect(UserModel.setResetPasswordToken(1, 'token', expires)).rejects.toThrow('Reset token update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const mockUsers: User[] = [
      {
        id: 1,
        email: 'user1@example.com',
        password: 'hashedpassword1',
        role: 'miner',
        first_name: 'User',
        last_name: 'One',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        email_verified: true,
      },
      {
        id: 2,
        email: 'user2@example.com',
        password: 'hashedpassword2',
        role: 'buyer',
        first_name: 'User',
        last_name: 'Two',
        created_at: new Date('2024-01-02'),
        updated_at: new Date('2024-01-02'),
        email_verified: false,
      },
    ];

    test('should find all users with pagination', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // COUNT query
        .mockResolvedValueOnce({ rows: mockUsers }); // SELECT query

      const result = await UserModel.findAll(1, 5);

      expect(result).toEqual({
        users: mockUsers,
        total: 10
      });

      expect(mockPgPool.query).toHaveBeenCalledTimes(2);
      expect(mockPgPool.query).toHaveBeenNthCalledWith(1, 'SELECT COUNT(*) FROM users');
      expect(mockPgPool.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [5, 0]
      );
    });

    test('should handle pagination correctly', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '25' }] }) // COUNT query
        .mockResolvedValueOnce({ rows: mockUsers }); // SELECT query

      const result = await UserModel.findAll(3, 10);

      expect(result.total).toBe(25);
      expect(mockPgPool.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [10, 20] // page 3 with limit 10 = offset 20
      );
    });

    test('should use default pagination values', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // COUNT query
        .mockResolvedValueOnce({ rows: mockUsers }); // SELECT query

      const result = await UserModel.findAll();

      expect(mockPgPool.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [10, 0] // default page 1, limit 10
      );
    });

    test('should handle database errors', async () => {
      const error = new Error('Database query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(UserModel.findAll()).rejects.toThrow('Database query failed');
    });
  });

  describe('findByRole', () => {
    const mockMiners: User[] = [
      {
        id: 1,
        email: 'miner1@example.com',
        password: 'hashedpassword1',
        role: 'miner',
        first_name: 'Miner',
        last_name: 'One',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        email_verified: true,
      },
      {
        id: 2,
        email: 'miner2@example.com',
        password: 'hashedpassword2',
        role: 'miner',
        first_name: 'Miner',
        last_name: 'Two',
        created_at: new Date('2024-01-02'),
        updated_at: new Date('2024-01-02'),
        email_verified: false,
      },
    ];

    test('should find users by role successfully', async () => {
      mockPgPool.query.mockResolvedValue({ rows: mockMiners } as any);

      const result = await UserModel.findByRole('miner');

      expect(result).toEqual(mockMiners);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC',
        ['miner']
      );
    });

    test('should return empty array when no users found', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await UserModel.findByRole('admin');

      expect(result).toEqual([]);
    });

    test('should handle database errors', async () => {
      const error = new Error('Role query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(UserModel.findByRole('miner')).rejects.toThrow('Role query failed');
    });
  });

  describe('emailExists', () => {
    test('should return true when email exists', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] } as any);

      const result = await UserModel.emailExists('existing@example.com');

      expect(result).toBe(true);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        'SELECT 1 FROM users WHERE email = $1',
        ['existing@example.com']
      );
    });

    test('should return false when email does not exist', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await UserModel.emailExists('nonexistent@example.com');

      expect(result).toBe(false);
    });

    test('should handle database errors', async () => {
      const error = new Error('Email check failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(UserModel.emailExists('test@example.com')).rejects.toThrow('Email check failed');
    });
  });
});

