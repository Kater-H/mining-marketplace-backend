import { Request, Response } from 'express';
import { userService, registerUser, verifyEmail, loginUser, getCurrentUser } from '../../controllers/userController';

describe('UserController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockReq = {};
    mockRes = {
      status: mockStatus,
      json: mockJson
    };
  });

  describe('registerUser', () => {
    beforeEach(() => {
      jest.spyOn(userService, 'registerUser').mockClear();
    });

    it('should register a new user and return 201 status', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'miner',
        first_name: 'John',
        last_name: 'Doe',
      };
      mockReq.body = mockUserData;

      (userService.registerUser as jest.Mock).mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com', role: 'miner' },
        verificationToken: 'mock_token',
      });

      await registerUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'User registered successfully',
        user: { id: 'user123', email: 'test@example.com', role: 'miner' },
        verificationToken: 'mock_token',
      });
      expect(userService.registerUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockUserData.email,
          password: mockUserData.password,
          role: mockUserData.role,
        })
      );
    });

    it('should return 400 if required fields are missing', async () => {
      mockReq.body = {
        email: 'test@example.com',
        // Missing password and role
      };

      await registerUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Please provide email, password, and role' });
    });

    it('should return 400 if role is invalid', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        role: 'invalid_role',
      };

      await registerUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Invalid role. Must be miner, buyer, admin, or verifier' });
    });

    it('should return 400 if user already exists', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        role: 'miner',
      };

      (userService.registerUser as jest.Mock).mockRejectedValue(new Error('User already exists with this email'));

      await registerUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'User already exists with this email' });
    });

    it('should return 500 if an unexpected error occurs', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        role: 'miner',
      };

      (userService.registerUser as jest.Mock).mockRejectedValue(new Error('Database error'));

      await registerUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Server error during registration' });
    });
  });

  describe('verifyEmail', () => {
    beforeEach(() => {
      jest.spyOn(userService, 'verifyEmail').mockClear();
    });

    it('should verify email successfully and return 200 status', async () => {
      const mockToken = 'mock_verification_token';
      mockReq.params = { token: mockToken };

      (userService.verifyEmail as jest.Mock).mockResolvedValue(true);

      await verifyEmail(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Email verified successfully' });
      expect(userService.verifyEmail).toHaveBeenCalledWith(mockToken);
    });

    it('should return 400 if verification token is missing', async () => {
      mockReq.params = {};

      await verifyEmail(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Verification token is required' });
      expect(userService.verifyEmail).not.toHaveBeenCalled();
    });

    it('should return 400 if verification token is invalid or expired', async () => {
      const mockToken = 'invalid_token';
      mockReq.params = { token: mockToken };

      (userService.verifyEmail as jest.Mock).mockResolvedValue(false);

      await verifyEmail(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Invalid or expired verification token' });
      expect(userService.verifyEmail).toHaveBeenCalledWith(mockToken);
    });

    it('should return 500 if an error occurs', async () => {
      const mockToken = 'mock_verification_token';
      mockReq.params = { token: mockToken };

      (userService.verifyEmail as jest.Mock).mockRejectedValue(new Error('Database error'));

      await verifyEmail(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Server error during email verification' });
      expect(userService.verifyEmail).toHaveBeenCalledWith(mockToken);
    });
  });

  describe('loginUser', () => {
    beforeEach(() => {
      jest.spyOn(userService, 'loginUser').mockClear();
    });

    it('should log in a user and return 200 status', async () => {
      const mockLoginData = {
        email: 'test@example.com',
        password: 'password123',
      };
      mockReq.body = mockLoginData;

      (userService.loginUser as jest.Mock).mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com', email_verified: true },
        token: 'mock_jwt_token',
      });

      await loginUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Login successful',
        user: { id: 'user123', email: 'test@example.com', email_verified: true },
        token: 'mock_jwt_token',
      });
      expect(userService.loginUser).toHaveBeenCalledWith(mockLoginData.email, mockLoginData.password);
    });

    it('should return 400 if email or password is missing', async () => {
      mockReq.body = {
        email: 'test@example.com',
        // Missing password
      };

      await loginUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Please provide email and password' });
      expect(userService.loginUser).not.toHaveBeenCalled();
    });

    it('should return 401 if credentials are invalid', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'wrong_password',
      };

      (userService.loginUser as jest.Mock).mockResolvedValue(null);

      await loginUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Invalid credentials' });
      expect(userService.loginUser).toHaveBeenCalledWith(mockReq.body.email, mockReq.body.password);
    });

    it('should return 401 if email is not verified', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      (userService.loginUser as jest.Mock).mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com', email_verified: false },
        token: 'mock_jwt_token',
      });

      await loginUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Please verify your email before logging in' });
      expect(userService.loginUser).toHaveBeenCalledWith(mockReq.body.email, mockReq.body.password);
    });

    it('should return 500 if an error occurs', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      (userService.loginUser as jest.Mock).mockRejectedValue(new Error('Database error'));

      await loginUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Server error during login' });
      expect(userService.loginUser).toHaveBeenCalledWith(mockReq.body.email, mockReq.body.password);
    });
  });

  describe('getCurrentUser', () => {
    beforeEach(() => {
      jest.spyOn(userService, 'getUserById').mockClear();
    });

    it('should return the current user and 200 status', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };
      (mockReq as any).user = { id: 'user123' };

      (userService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      await getCurrentUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ user: mockUser });
      expect(userService.getUserById).toHaveBeenCalledWith('user123');
    });

    it('should return 404 if user is not found', async () => {
      (mockReq as any).user = { id: 'nonexistent_user' };

      (userService.getUserById as jest.Mock).mockResolvedValue(null);

      await getCurrentUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ message: 'User not found' });
      expect(userService.getUserById).toHaveBeenCalledWith('nonexistent_user');
    });

    it('should return 500 if an error occurs', async () => {
      (mockReq as any).user = { id: 'user123' };

      (userService.getUserById as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getCurrentUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Server error getting user data' });
      expect(userService.getUserById).toHaveBeenCalledWith('user123');
    });
  });
});

