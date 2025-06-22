import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';

// Mock the database pool
const mockPool = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn()
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

// Mock the database module
jest.mock('../../config/database', () => ({
  pgPool: mockPool,
  getPool: () => mockPool
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_jwt_token'),
  verify: jest.fn().mockReturnValue({ id: 1, email: 'test@example.com', role: 'buyer' })
}));

// Import controllers after mocking
import { registerUser, loginUser, verifyEmail, getCurrentUser } from '../../controllers/userController';
import { protect } from '../../middleware/authMiddleware';

// Create test app with real controllers but mocked dependencies
const createTestApp = () => {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // User routes
  app.post('/api/users/register', registerUser);
  app.post('/api/users/login', loginUser);
  app.get('/api/users/verify/:token', verifyEmail);
  app.get('/api/users/me', protect, getCurrentUser);
  
  // Error handling
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Test app error:', err);
    res.status(err.statusCode || 500).json({
      error: err.message || 'Internal Server Error'
    });
  });
  
  return app;
};

describe('User Authentication Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
    
    // Setup default mock behaviors
    mockPool.connect.mockResolvedValue(mockClient);
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock behaviors
    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe('POST /api/users/register', () => {
    test('should successfully register a new user', async () => {
      // Mock database responses
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // Check if user exists (empty result)
        .mockResolvedValueOnce({ // Insert new user
          rows: [{
            id: 1,
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
            role: 'buyer',
            is_verified: false,
            created_at: new Date()
          }]
        });

      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        first_name: 'John',
        last_name: 'Doe',
        role: 'buyer'
      };

      try {
        const response = await request(app)
          .post('/api/users/register')
          .send(userData);

        console.log('Registration response status:', response.status);
        console.log('Registration response body:', JSON.stringify(response.body, null, 2));
        
        if (response.status === 500) {
          console.log('500 Error Details:');
          console.log('- Error message:', response.body.message);
          console.log('- Full response:', response.body);
        }

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(userData.email);
        expect(response.body.user.firstName).toBe(userData.first_name);
        expect(response.body.user.lastName).toBe(userData.last_name);
        expect(response.body.user.role).toBe(userData.role);
        expect(response.body.user.isVerified).toBe(false);
      } catch (error) {
        console.error('Test execution error:', error);
        throw error;
      }
    });

    test('should reject registration with duplicate email', async () => {
      // Mock database response for existing user
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{
          id: 1,
          email: 'existing@example.com'
        }]
      });

      const userData = {
        email: 'existing@example.com',
        password: 'SecurePassword123!',
        first_name: 'John',
        last_name: 'Doe',
        role: 'buyer'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData);

      console.log('Duplicate email response:', response.status, response.body);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/already exists/i);
    });
  });

  describe('POST /api/users/login', () => {
    test('should successfully login with valid credentials', async () => {
      // Mock database response for user lookup
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password_hash: 'hashed_password',
          first_name: 'John',
          last_name: 'Doe',
          role: 'buyer',
          is_verified: true
        }]
      });

      const loginData = {
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData);

      console.log('Login response:', response.status, response.body);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginData.email);
    });

    test('should reject login with invalid credentials', async () => {
      // Mock database response for user not found
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const loginData = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData);

      console.log('Invalid login response:', response.status, response.body);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/invalid.*credentials/i);
    });
  });

  describe('GET /api/users/me', () => {
    test('should access protected route with valid token', async () => {
      // Mock database response for user lookup
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'buyer',
          is_verified: true
        }]
      });

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer mock_jwt_token');

      console.log('Protected route response:', response.status, response.body);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    test('should reject access without token', async () => {
      const response = await request(app)
        .get('/api/users/me');

      console.log('No token response:', response.status, response.body);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});

