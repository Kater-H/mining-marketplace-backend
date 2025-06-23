// Set test environment variables BEFORE importing modules - CRITICAL for JWT secret consistency
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'mining_marketplace_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_purposes_only';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_webhook_secret';
process.env.FLUTTERWAVE_SECRET_KEY = 'FLWSECK_TEST-fake_key_for_testing';

import supertest from 'supertest';

// Define mock functions at the top level
let mockStripePaymentIntentsCreate: jest.Mock;
let mockStripeWebhooksConstructEvent: jest.Mock;
let mockFlutterwavePaymentsInitiate: jest.Mock;

// Variables for dynamically loaded modules
let app: any;
let request: supertest.SuperTest<supertest.Test>;
let pgPool: any;

describe('Payment Processing - Complete Dynamic Mocking Solution', () => {
  let authenticatedBuyer: any;
  let authenticatedMiner: any;
  let testListing: any;
  let buyerAuthToken: string;
  let minerAuthToken: string;

  beforeEach(async () => {
    // STEP 1: Reset the module registry to ensure fresh imports
    jest.resetModules();

    // STEP 2: Initialize fresh mocks for each test
    mockStripePaymentIntentsCreate = jest.fn();
    mockStripeWebhooksConstructEvent = jest.fn();
    mockFlutterwavePaymentsInitiate = jest.fn();

    // STEP 3: Apply dynamic mocks BEFORE requiring any modules
    jest.doMock('stripe', () => {
      return jest.fn().mockImplementation(() => ({
        paymentIntents: {
          create: mockStripePaymentIntentsCreate,
        },
        webhooks: {
          constructEvent: mockStripeWebhooksConstructEvent,
        },
      }));
    });

    jest.doMock('flutterwave-node-v3', () => {
      return jest.fn().mockImplementation(() => ({
        Payments: {
          initiate: mockFlutterwavePaymentsInitiate,
        },
      }));
    });

    // STEP 4: Dynamically require modules AFTER mocks are set up
    const express = require('express');
    const { pgPool: dynamicPgPool } = require('../../config/database');
    const { paymentRoutes } = require('../../routes/paymentRoutes');
    const userRoutes = require('../../routes/userRoutes');
    const { marketplaceRoutes } = require('../../routes/marketplaceRoutes');

    // Set the pgPool for cleanup operations
    pgPool = dynamicPgPool;

    // STEP 5: Create Express app with dynamically loaded routes
    app = express();
    app.use(express.json());
    app.use(express.raw({ type: 'application/json' }));

    // Add routes
    app.use('/api/users', userRoutes.default || userRoutes);
    app.use('/api/marketplace', marketplaceRoutes);
    app.use('/api/payment', paymentRoutes);

    // Error handling
    app.use((error: any, req: any, res: any, next: any) => {
      console.error('❌ Test app error:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    });

    request = supertest(app);

    // STEP 6: Clean up test data
    await cleanupTestData();

    // Clear all Jest mock call counts
    jest.clearAllMocks();

    console.log('🚀 Dynamic mocking setup completed successfully');
  });

  afterEach(async () => {
    await cleanupTestData();
    jest.clearAllMocks();
  });

  // Helper function to clean up test data
  const cleanupTestData = async () => {
    try {
      const client = await pgPool.connect();
      
      // Clean up transactions
      await client.query(`
        DELETE FROM transactions 
        WHERE buyer_id IN (
          SELECT id FROM users 
          WHERE email LIKE '%@example.com' 
             OR email LIKE '%@test.com'
             OR email LIKE '%test%'
        )
      `);
      
      // Clean up mineral listings
      await client.query(`
        DELETE FROM mineral_listings 
        WHERE user_id IN (
          SELECT id FROM users 
          WHERE email LIKE '%@example.com' 
             OR email LIKE '%@test.com'
             OR email LIKE '%test%'
        )
      `);
      
      // Clean up users
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
  };

  // Helper function to create and authenticate a user
  const createAuthenticatedUser = async (role: string = 'buyer') => {
    const timestamp = Date.now();
    const userData = {
      email: `${role}${timestamp}@example.com`,
      password: 'SecurePassword123!',
      first_name: 'Test',
      last_name: 'User',
      role: role
    };

    // Register user
    console.log('🔧 Registering user:', userData.email);
    const registerResponse = await request
      .post('/api/users/register')
      .send(userData);

    if (registerResponse.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(registerResponse.body)}`);
    }

    // Verify email
    const verificationToken = registerResponse.body.verificationToken;
    const verifyResponse = await request
      .get(`/api/users/verify/${verificationToken}`);

    if (verifyResponse.status !== 200) {
      throw new Error(`Verification failed: ${JSON.stringify(verifyResponse.body)}`);
    }

    // Login user
    const loginResponse = await request
      .post('/api/users/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`);
    }

    const authToken = loginResponse.body.token;
    expect(authToken).toBeDefined();

    console.log('✅ User authenticated successfully:', userData.email);

    return {
      user: loginResponse.body.user,
      token: authToken,
      userData
    };
  };

  // Helper function to create a test listing
  const createTestListing = async (token: string) => {
    const client = await pgPool.connect();
    try {
      const listingData = {
        commodity_type: 'Gold',
        volume: 100.5,
        grade: 'High Grade',
        origin_location: 'Australia',
        price_per_unit: 500,
        currency: 'USD',
        available: true,
        description: 'High quality gold ore',
        status: 'active'
      };

      // Get user ID from token
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      const insertQuery = `
        INSERT INTO mineral_listings (
          user_id, commodity_type, volume, grade,
          origin_location, price_per_unit, currency, 
          available, description, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
      `;

      const result = await client.query(insertQuery, [
        userId,
        listingData.commodity_type,
        listingData.volume,
        listingData.grade,
        listingData.origin_location,
        listingData.price_per_unit,
        listingData.currency,
        listingData.available,
        listingData.description,
        listingData.status
      ]);

      const listing = result.rows[0];
      console.log('✅ Test listing created:', listing.id);

      return { listing };
    } finally {
      client.release();
    }
  };

  // Setup test users and listing
  beforeEach(async () => {
    console.log('🔧 Setting up test users and listing...');
    
    authenticatedBuyer = await createAuthenticatedUser('buyer');
    buyerAuthToken = authenticatedBuyer.token;

    authenticatedMiner = await createAuthenticatedUser('miner');
    minerAuthToken = authenticatedMiner.token;

    const { listing } = await createTestListing(minerAuthToken);
    testListing = listing;

    console.log('✅ Test setup completed');
  });

  describe('POST /api/payment/stripe/create - Dynamic Mocking Solution', () => {
    test('should successfully create Stripe Payment Intent with proper dynamic mocking', async () => {
      console.log('🧪 Testing Stripe payment with complete dynamic mocking solution...');

      // Mock Stripe payment intent creation
      const mockPaymentIntent = {
        id: 'pi_dynamic_mock_test',
        client_secret: 'pi_dynamic_mock_test_secret',
        amount: 5000000,
        currency: 'usd',
        status: 'requires_payment_method'
      };

      // Set up the mock response
      mockStripePaymentIntentsCreate.mockResolvedValue(mockPaymentIntent);

      const paymentData = {
        amount: 50000,
        currency: 'USD',
        listing_id: testListing.id
      };

      console.log('🔑 Making payment request with dynamic mocking...');
      const response = await request
        .post('/api/payment/stripe/create')
        .set('Authorization', `Bearer ${buyerAuthToken}`)
        .send(paymentData);

      console.log('📊 Response status:', response.status);
      console.log('📊 Response body:', response.body);
      console.log('🔍 Mock call count:', mockStripePaymentIntentsCreate.mock.calls.length);
      console.log('🔍 Mock calls:', mockStripePaymentIntentsCreate.mock.calls);

      // Verify the response
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('client_secret');
      expect(response.body).toHaveProperty('transaction_id');
      expect(response.body.client_secret).toBe(mockPaymentIntent.client_secret);

      // Verify Stripe mock was called correctly
      expect(mockStripePaymentIntentsCreate).toHaveBeenCalledTimes(1);
      expect(mockStripePaymentIntentsCreate).toHaveBeenCalledWith({
        amount: 5000000,
        currency: 'usd',
        metadata: {
          buyer_id: authenticatedBuyer.user.id.toString(),
          listing_id: testListing.id.toString(),
        },
      });

      // Verify transaction was created in database
      const client = await pgPool.connect();
      const dbResult = await client.query(
        'SELECT * FROM transactions WHERE buyer_id = $1 AND listing_id = $2',
        [authenticatedBuyer.user.id, testListing.id]
      );
      client.release();

      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].payment_provider).toBe('stripe');
      expect(dbResult.rows[0].payment_id).toBe(mockPaymentIntent.id);

      console.log('✅ DYNAMIC MOCKING SUCCESS! Stripe payment test passed completely!');
    });

    test('should handle Stripe errors properly with dynamic mocking', async () => {
      console.log('🧪 Testing Stripe error handling with dynamic mocking...');

      // Mock Stripe to throw an error
      const stripeError = new Error('Stripe API error');
      mockStripePaymentIntentsCreate.mockRejectedValue(stripeError);

      const paymentData = {
        amount: 50000,
        currency: 'USD',
        listing_id: testListing.id
      };

      const response = await request
        .post('/api/payment/stripe/create')
        .set('Authorization', `Bearer ${buyerAuthToken}`)
        .send(paymentData);

      console.log('📊 Error response status:', response.status);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
      expect(mockStripePaymentIntentsCreate).toHaveBeenCalledTimes(1);

      console.log('✅ Stripe error handling test passed!');
    });

    test('should reject unauthenticated requests', async () => {
      console.log('🧪 Testing unauthenticated request rejection...');

      const paymentData = {
        amount: 50000,
        currency: 'USD',
        listing_id: testListing.id
      };

      const response = await request
        .post('/api/payment/stripe/create')
        .send(paymentData); // No Authorization header

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/authentication.*required/i);

      // Stripe should not be called for unauthenticated requests
      expect(mockStripePaymentIntentsCreate).not.toHaveBeenCalled();

      console.log('✅ Unauthenticated request test passed!');
    });
  });

  describe('Mock Verification Tests', () => {
    test('should verify dynamic mocking is working correctly', async () => {
      console.log('🧪 Verifying dynamic mocking setup...');

      // Test that mocks are properly initialized
      expect(mockStripePaymentIntentsCreate).toBeDefined();
      expect(typeof mockStripePaymentIntentsCreate).toBe('function');

      // Test that we can control mock behavior
      const testResponse = { id: 'test_verification' };
      mockStripePaymentIntentsCreate.mockResolvedValue(testResponse);

      // Verify mock behavior
      const result = await mockStripePaymentIntentsCreate({});
      expect(result).toEqual(testResponse);

      console.log('✅ Dynamic mocking verification passed!');
    });
  });
});

