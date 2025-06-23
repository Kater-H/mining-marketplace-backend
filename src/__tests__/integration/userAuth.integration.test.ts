import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';

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

describe('User Authentication Flow - Complete Integration Tests', () => {
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
      console.log('✅ User Auth Integration: Test database connection established');
    } catch (error) {
      console.error('❌ User Auth Integration: Test database connection failed:', error);
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

  describe('POST /api/users/register - User Registration', () => {
    test('should successfully register a new user', async () => {
      const userData = {
        email: 'register@example.com',
        password: 'SecurePassword123!',
        first_name: 'John',
        last_name: 'Doe',
        role: 'buyer'
      };

      console.log('🧪 Testing user registration...');

      const response = await request(app)
        .post('/api/users/register')
        .send(userData);

      console.log('📊 Registration response:', response.status);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.isVerified).toBe(false);
      expect(response.body).toHaveProperty('verificationToken');
      
      console.log('✅ User registration test passed!');
    });

    test('should reject registration with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
        first_name: 'John',
        last_name: 'Doe',
        role: 'buyer'
      };

      // First registration
      await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/users/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/already.*use/i);
    });
  });

  describe('POST /api/users/login - User Login Flow', () => {
    let testUser: any;
    let verificationToken: string;

    beforeEach(async () => {
      // Register and verify a user for login tests
      const userData = {
        email: 'login@example.com',
        password: 'SecurePassword123!',
        first_name: 'Login',
        last_name: 'User',
        role: 'buyer'
      };

      // Register user
      const registerResponse = await request(app)
        .post('/api/users/register')
        .send(userData);

      testUser = userData;
      verificationToken = registerResponse.body.verificationToken;

      // Verify the user's email
      await request(app)
        .get(`/api/users/verify/${verificationToken}`)
        .expect(200);
    });

    test('should successfully login with valid credentials', async () => {
      console.log('🧪 Testing successful login...');

      const loginData = {
        email: testUser.email,
        password: testUser.password
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData);

      console.log('📊 Login response status:', response.status);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.user.isVerified).toBe(true);
      expect(response.body.user).not.toHaveProperty('password');
      
      // Verify JWT token is valid
      const token = response.body.token;
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      
      console.log('✅ Successful login test passed!');
    });

    test('should reject login with incorrect password', async () => {
      console.log('🧪 Testing login with incorrect password...');

      const loginData = {
        email: testUser.email,
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData);

      console.log('📊 Incorrect password response:', response.status);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/invalid.*credentials/i);
      
      console.log('✅ Incorrect password test passed!');
    });

    test('should reject login with non-existent email', async () => {
      console.log('🧪 Testing login with non-existent email...');

      const loginData = {
        email: 'nonexistent@example.com',
        password: 'SomePassword123!'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData);

      console.log('📊 Non-existent email response:', response.status);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/invalid.*credentials/i);
      
      console.log('✅ Non-existent email test passed!');
    });

    test('should reject login with missing credentials', async () => {
      console.log('🧪 Testing login with missing credentials...');

      const loginData = {
        email: testUser.email
        // Missing password
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData);

      console.log('📊 Missing credentials response:', response.status);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      
      console.log('✅ Missing credentials test passed!');
    });

    test('should reject login for unverified user', async () => {
      console.log('🧪 Testing login for unverified user...');

      // Register a new user but don't verify
      const unverifiedUserData = {
        email: 'unverified@example.com',
        password: 'SecurePassword123!',
        first_name: 'Unverified',
        last_name: 'User',
        role: 'buyer'
      };

      await request(app)
        .post('/api/users/register')
        .send(unverifiedUserData)
        .expect(201);

      // Try to login without verification
      const loginData = {
        email: unverifiedUserData.email,
        password: unverifiedUserData.password
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData);

      console.log('📊 Unverified user login response:', response.status);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/email.*not.*verified/i);
      
      console.log('✅ Unverified user login test passed!');
    });
  });

  describe('GET /api/users/verify/:token - Email Verification Flow', () => {
    let testUser: any;
    let verificationToken: string;

    beforeEach(async () => {
      // Register a user to get verification token
      const userData = {
        email: 'verify@example.com',
        password: 'SecurePassword123!',
        first_name: 'Verify',
        last_name: 'User',
        role: 'buyer'
      };

      const registerResponse = await request(app)
        .post('/api/users/register')
        .send(userData);

      testUser = userData;
      verificationToken = registerResponse.body.verificationToken;
    });

    test('should successfully verify email with valid token', async () => {
      console.log('🧪 Testing successful email verification...');

      const response = await request(app)
        .get(`/api/users/verify/${verificationToken}`);

      console.log('📊 Email verification response:', response.status);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/verified.*successfully/i);

      // Verify user is marked as verified in database
      const client = await testPool.connect();
      const dbResult = await client.query(
        'SELECT is_verified FROM users WHERE email = $1',
        [testUser.email]
      );
      client.release();
      
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].is_verified).toBe(true);
      
      console.log('✅ Email verification test passed!');
    });

    test('should reject verification with invalid token', async () => {
      console.log('🧪 Testing verification with invalid token...');

      const invalidToken = 'invalid.token.here';

      const response = await request(app)
        .get(`/api/users/verify/${invalidToken}`);

      console.log('📊 Invalid token response:', response.status);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/invalid.*expired.*token/i);

      // Verify user is still not verified in database
      const client = await testPool.connect();
      const dbResult = await client.query(
        'SELECT is_verified FROM users WHERE email = $1',
        [testUser.email]
      );
      client.release();
      
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].is_verified).toBe(false);
      
      console.log('✅ Invalid token test passed!');
    });

    test('should reject verification with expired token', async () => {
      console.log('🧪 Testing verification with expired token...');

      // Create an expired token
      const expiredToken = jwt.sign(
        { email: testUser.email },
        process.env.JWT_SECRET || 'test-jwt-secret-for-integration-tests',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get(`/api/users/verify/${expiredToken}`);

      console.log('📊 Expired token response:', response.status);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/invalid.*expired.*token/i);

      // Verify user is still not verified in database
      const client = await testPool.connect();
      const dbResult = await client.query(
        'SELECT is_verified FROM users WHERE email = $1',
        [testUser.email]
      );
      client.release();
      
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].is_verified).toBe(false);
      
      console.log('✅ Expired token test passed!');
    });

    test('should handle verification of already verified user gracefully', async () => {
      console.log('🧪 Testing verification of already verified user...');

      // First verification
      await request(app)
        .get(`/api/users/verify/${verificationToken}`)
        .expect(200);

      // Second verification attempt
      const response = await request(app)
        .get(`/api/users/verify/${verificationToken}`);

      console.log('📊 Already verified response:', response.status);

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/verified.*successfully/i);

      // Verify user is still verified in database
      const client = await testPool.connect();
      const dbResult = await client.query(
        'SELECT is_verified FROM users WHERE email = $1',
        [testUser.email]
      );
      client.release();
      
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].is_verified).toBe(true);
      
      console.log('✅ Already verified test passed!');
    });
  });

  describe('GET /api/users/me - Protected Route Access', () => {
    let authToken: string;
    let verifiedUser: any;

    beforeEach(async () => {
      // Create and verify a user, then login to get auth token
      const userData = {
        email: 'protected@example.com',
        password: 'SecurePassword123!',
        first_name: 'Protected',
        last_name: 'User',
        role: 'buyer'
      };

      // Register user
      const registerResponse = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      // Verify email
      const verificationToken = registerResponse.body.verificationToken;
      await request(app)
        .get(`/api/users/verify/${verificationToken}`)
        .expect(200);

      // Login to get auth token
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      authToken = loginResponse.body.token;
      verifiedUser = loginResponse.body.user;
    });

    test('should successfully access protected route with valid JWT token', async () => {
      console.log('🧪 Testing protected route access with valid token...');

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      console.log('📊 Protected route response:', response.status);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.id).toBe(verifiedUser.id);
      expect(response.body.user.email).toBe(verifiedUser.email);
      expect(response.body.user.firstName).toBe(verifiedUser.firstName);
      expect(response.body.user.lastName).toBe(verifiedUser.lastName);
      expect(response.body.user.role).toBe(verifiedUser.role);
      expect(response.body.user.isVerified).toBe(true);
      
      // Ensure password is not returned
      expect(response.body.user).not.toHaveProperty('password');
      
      console.log('✅ Protected route access test passed!');
    });

    test('should reject access to protected route without token', async () => {
      console.log('🧪 Testing protected route access without token...');

      const response = await request(app)
        .get('/api/users/me');

      console.log('📊 No token response:', response.status);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/authentication.*required/i);
      
      console.log('✅ No token test passed!');
    });

    test('should reject access to protected route with invalid token', async () => {
      console.log('🧪 Testing protected route access with invalid token...');

      const invalidToken = 'invalid.jwt.token.here';

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${invalidToken}`);

      console.log('📊 Invalid token response:', response.status);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/invalid.*token/i);
      
      console.log('✅ Invalid token test passed!');
    });

    test('should reject access to protected route with malformed Authorization header', async () => {
      console.log('🧪 Testing protected route access with malformed header...');

      // Missing "Bearer " prefix
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', authToken);

      console.log('📊 Malformed header response:', response.status);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/authentication.*required/i);
      
      console.log('✅ Malformed header test passed!');
    });

    test('should reject access to protected route with expired token', async () => {
      console.log('🧪 Testing protected route access with expired token...');

      // Create an expired token
      const expiredToken = jwt.sign(
        { 
          id: verifiedUser.id,
          email: verifiedUser.email,
          role: verifiedUser.role
        },
        process.env.JWT_SECRET || 'test-jwt-secret-for-integration-tests',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      console.log('📊 Expired token response:', response.status);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/invalid.*expired.*token/i);
      
      console.log('✅ Expired token test passed!');
    });

    test('should reject access when user no longer exists in database', async () => {
      console.log('🧪 Testing protected route access for deleted user...');

      // Delete the user from database while keeping valid token
      const client = await testPool.connect();
      await client.query('DELETE FROM users WHERE email = $1', [verifiedUser.email]);
      client.release();

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      console.log('📊 Deleted user response:', response.status);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/user.*not.*found/i);
      
      console.log('✅ Deleted user test passed!');
    });
  });

  describe('Complete Authentication Flow - End-to-End', () => {
    test('should complete full authentication workflow: register → verify → login → access protected route', async () => {
      console.log('🧪 Testing complete end-to-end authentication flow...');

      // Step 1: Register user
      const userData = {
        email: 'e2e@example.com',
        password: 'SecurePassword123!',
        first_name: 'EndToEnd',
        last_name: 'User',
        role: 'buyer'
      };

      console.log('📝 Step 1: User registration...');
      const registerResponse = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.user.isVerified).toBe(false);
      expect(registerResponse.body).toHaveProperty('verificationToken');

      // Step 2: Verify email
      console.log('📝 Step 2: Email verification...');
      const verificationToken = registerResponse.body.verificationToken;
      const verifyResponse = await request(app)
        .get(`/api/users/verify/${verificationToken}`)
        .expect(200);

      expect(verifyResponse.body.message).toMatch(/verified.*successfully/i);

      // Step 3: Login
      console.log('📝 Step 3: User login...');
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body.user.isVerified).toBe(true);

      // Step 4: Access protected route
      console.log('📝 Step 4: Protected route access...');
      const protectedResponse = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      expect(protectedResponse.body.user.email).toBe(userData.email);
      expect(protectedResponse.body.user.isVerified).toBe(true);

      // Verify final database state
      const client = await testPool.connect();
      const dbResult = await client.query(
        'SELECT id, email, first_name, last_name, role, is_verified FROM users WHERE email = $1',
        [userData.email]
      );
      client.release();

      expect(dbResult.rows).toHaveLength(1);
      const dbUser = dbResult.rows[0];
      expect(dbUser.email).toBe(userData.email);
      expect(dbUser.first_name).toBe(userData.first_name);
      expect(dbUser.last_name).toBe(userData.last_name);
      expect(dbUser.role).toBe(userData.role);
      expect(dbUser.is_verified).toBe(true);
      
      console.log('✅ Complete end-to-end authentication flow test passed!');
    });

    test('should prevent login before email verification', async () => {
      console.log('🧪 Testing login prevention before email verification...');

      // Step 1: Register user
      const userData = {
        email: 'unverified@example.com',
        password: 'SecurePassword123!',
        first_name: 'Unverified',
        last_name: 'User',
        role: 'buyer'
      };

      await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      // Step 2: Try to login without verification
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      // Should fail because email is not verified
      expect(loginResponse.status).toBe(401);
      expect(loginResponse.body).toHaveProperty('message');
      expect(loginResponse.body.message).toMatch(/email.*not.*verified/i);
      
      console.log('✅ Login prevention test passed!');
    });
  });
});

