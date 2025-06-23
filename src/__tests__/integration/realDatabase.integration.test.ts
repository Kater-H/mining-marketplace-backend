import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Import controllers
import { registerUser, loginUser, verifyEmail, getCurrentUser } from '../../controllers/userController';
import { protect } from '../../middleware/authMiddleware';

// Create test app with real controllers and real database
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

describe('Real Database Integration Tests', () => {
  let app: express.Application;
  let testPool: Pool;

  beforeAll(async () => {
    // Set NODE_ENV to test
    process.env.NODE_ENV = 'test';
    
    // Create test app
    app = createTestApp();
    
    // Create test database connection
    testPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'mining_marketplace_test',
      user: process.env.DB_USER || 'test_user',
      password: process.env.DB_PASSWORD || 'test_password',
    });
    
    // Test the connection
    try {
      const client = await testPool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✅ Test database connection established successfully');
    } catch (error) {
      console.error('❌ Test database connection failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (testPool) {
      await testPool.end();
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    try {
      const client = await testPool.connect();
      await client.query(`
        DELETE FROM users 
        WHERE email LIKE '%@example.com' 
           OR email LIKE '%@test.com'
           OR email LIKE '%test%'
      `);
      client.release();
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  });

  describe('POST /api/users/register', () => {
    test('should successfully register a new user with real database', async () => {
      const userData = {
        email: 'realtest@example.com',
        password: 'SecurePassword123!',
        first_name: 'John',
        last_name: 'Doe',
        role: 'buyer'
      };

      console.log('🧪 Testing user registration with real database...');
      console.log('📝 User data:', userData);

      try {
        const response = await request(app)
          .post('/api/users/register')
          .send(userData);

        console.log('📊 Registration response status:', response.status);
        console.log('📊 Registration response body:', JSON.stringify(response.body, null, 2));
        
        if (response.status === 500) {
          console.log('❌ 500 Error Details:');
          console.log('- Error message:', response.body.message);
          console.log('- Full response:', response.body);
        }

        // Assertions
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(userData.email);
        expect(response.body.user.firstName).toBe(userData.first_name);
        expect(response.body.user.lastName).toBe(userData.last_name);
        expect(response.body.user.role).toBe(userData.role);
        expect(response.body.user.isVerified).toBe(false);
        expect(response.body).toHaveProperty('verificationToken');
        
        // Verify user was actually created in database
        const client = await testPool.connect();
        const dbResult = await client.query(
          'SELECT id, email, first_name, last_name, role, is_verified FROM users WHERE email = $1',
          [userData.email]
        );
        client.release();
        
        expect(dbResult.rows).toHaveLength(1);
        expect(dbResult.rows[0].email).toBe(userData.email);
        expect(dbResult.rows[0].first_name).toBe(userData.first_name);
        expect(dbResult.rows[0].last_name).toBe(userData.last_name);
        expect(dbResult.rows[0].role).toBe(userData.role);
        expect(dbResult.rows[0].is_verified).toBe(false);
        
        console.log('✅ User registration test passed!');
      } catch (error) {
        console.error('❌ Test execution error:', error);
        throw error;
      }
    });

    test('should reject registration with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
        first_name: 'John',
        last_name: 'Doe',
        role: 'buyer'
      };

      console.log('🧪 Testing duplicate email rejection...');

      // First registration
      const firstResponse = await request(app)
        .post('/api/users/register')
        .send(userData);

      expect(firstResponse.status).toBe(201);

      // Second registration with same email
      const secondResponse = await request(app)
        .post('/api/users/register')
        .send(userData);

      console.log('📊 Duplicate email response:', secondResponse.status, secondResponse.body);

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body).toHaveProperty('message');
      expect(secondResponse.body.message).toMatch(/already.*use/i);
      
      console.log('✅ Duplicate email rejection test passed!');
    });
  });

  describe('Database Connection Verification', () => {
    test('should be able to connect to test database', async () => {
      console.log('🧪 Testing direct database connection...');
      
      const client = await testPool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toHaveProperty('current_time');
      
      console.log('✅ Database connection test passed!');
      console.log('📊 Current time from DB:', result.rows[0].current_time);
    });

    test('should be able to query users table', async () => {
      console.log('🧪 Testing users table access...');
      
      const client = await testPool.connect();
      const result = await client.query('SELECT COUNT(*) as user_count FROM users');
      client.release();
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toHaveProperty('user_count');
      
      console.log('✅ Users table access test passed!');
      console.log('📊 Current user count:', result.rows[0].user_count);
    });
  });
});

