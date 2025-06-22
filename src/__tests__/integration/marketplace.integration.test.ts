import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Import controllers
import { registerUser, loginUser, verifyEmail } from '../../controllers/userController';
import { 
  createMineralListing, 
  getMineralListings, 
  getMineralListingById,
  updateMineralListing,
  deleteMineralListing
} from '../../controllers/marketplaceController';
import { protect, authorize } from '../../middleware/authMiddleware';

// Create test app with real controllers and real database
const createTestApp = () => {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // User routes (for authentication setup)
  app.post('/api/users/register', registerUser);
  app.post('/api/users/login', loginUser);
  app.get('/api/users/verify/:token', verifyEmail);
  
  // Marketplace routes - using the same pattern as the actual routes
  app.get('/api/marketplace/minerals', getMineralListings);
  app.get('/api/marketplace/minerals/:id', getMineralListingById);
  app.post('/api/marketplace/minerals', protect, authorize('miner', 'admin'), createMineralListing);
  app.put('/api/marketplace/minerals/:id', protect, authorize('miner', 'admin'), updateMineralListing);
  app.delete('/api/marketplace/minerals/:id', protect, authorize('miner', 'admin'), deleteMineralListing);
  
  // Error handling
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Test app error:', err);
    console.error('Error stack:', err.stack);
    res.status(err.statusCode || 500).json({
      error: err.message || 'Internal Server Error',
      details: err.stack
    });
  });
  
  return app;
};

describe('Marketplace Operations - Complete Integration Tests', () => {
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
      console.log('✅ Marketplace Integration: Test database connection established');
    } catch (error) {
      console.error('❌ Marketplace Integration: Test database connection failed:', error);
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
      
      // Clean up mineral listings first (due to foreign key constraint)
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
  });

  // Helper function to create and authenticate a user
  const createAuthenticatedUser = async (role: string = 'miner') => {
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
    const registerResponse = await request(app)
      .post('/api/users/register')
      .send(userData);

    console.log('📊 Registration response status:', registerResponse.status);
    if (registerResponse.status !== 201) {
      console.error('❌ Registration failed:', registerResponse.body);
      throw new Error(`Registration failed with status ${registerResponse.status}: ${JSON.stringify(registerResponse.body)}`);
    }

    // Verify email
    const verificationToken = registerResponse.body.verificationToken;
    console.log('🔧 Verifying email with token:', verificationToken ? 'present' : 'missing');
    const verifyResponse = await request(app)
      .get(`/api/users/verify/${verificationToken}`);

    console.log('📊 Verification response status:', verifyResponse.status);
    if (verifyResponse.status !== 200) {
      console.error('❌ Verification failed:', verifyResponse.body);
      throw new Error(`Verification failed with status ${verifyResponse.status}`);
    }

    // Login to get auth token
    console.log('🔧 Logging in user:', userData.email);
    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    console.log('📊 Login response status:', loginResponse.status);
    if (loginResponse.status !== 200) {
      console.error('❌ Login failed:', loginResponse.body);
      throw new Error(`Login failed with status ${loginResponse.status}`);
    }

    return {
      user: loginResponse.body.user,
      token: loginResponse.body.token,
      userData
    };
  };

  // Helper function to create a test mineral listing
  const createTestListing = async (authToken: string, overrides: any = {}) => {
    const listingData = {
      commodity_type: 'Gold',
      volume: 100.5,
      volume_unit: 'kg',
      grade: 'High Grade',
      origin_country: 'Australia',
      origin_region: 'Western Australia',
      price: 50000,
      price_currency: 'USD',
      price_per_unit: 500,
      description: 'High quality gold ore from Western Australia',
      ...overrides
    };

    const response = await request(app)
      .post('/api/marketplace/minerals')
      .set('Authorization', `Bearer ${authToken}`)
      .send(listingData);

    return { response, listingData };
  };

  describe('POST /api/marketplace/minerals - Mineral Listing Creation', () => {
    test('should successfully create a new mineral listing by authenticated miner', async () => {
      console.log('🧪 Testing mineral listing creation by authenticated miner...');

      const { token } = await createAuthenticatedUser('miner');

      const listingData = {
        commodity_type: 'Gold',
        volume: 100.5,
        volume_unit: 'kg',
        grade: 'High Grade',
        origin_country: 'Australia',
        origin_region: 'Western Australia',
        price: 50000,
        price_currency: 'USD',
        price_per_unit: 500,
        description: 'High quality gold ore from Western Australia'
      };

      const response = await request(app)
        .post('/api/marketplace/minerals')
        .set('Authorization', `Bearer ${token}`)
        .send(listingData);

      console.log('📊 Listing creation response:', response.status);
      if (response.status !== 201) {
        console.error('❌ Listing creation failed:', response.body);
      }

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('listing');
      expect(response.body.listing.commodity_type).toBe(listingData.commodity_type);
      expect(parseFloat(response.body.listing.volume)).toBe(listingData.volume);
      expect(response.body.listing.grade).toBe(listingData.grade);
      expect(response.body.listing.origin_location).toBe(listingData.origin_country);
      expect(parseFloat(response.body.listing.price_per_unit)).toBe(listingData.price_per_unit);
      expect(response.body.listing.currency).toBe(listingData.price_currency);
      expect(response.body.listing.available).toBe(true);
      expect(response.body.listing.status).toBe('active');

      // Verify listing was created in database
      const client = await testPool.connect();
      const dbResult = await client.query(
        'SELECT * FROM mineral_listings WHERE commodity_type = $1 AND volume = $2',
        [listingData.commodity_type, listingData.volume]
      );
      client.release();

      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].commodity_type).toBe(listingData.commodity_type);
      expect(parseFloat(dbResult.rows[0].volume)).toBe(listingData.volume);
      
      console.log('✅ Mineral listing creation test passed!');
    });

    test('should reject creation with missing required fields', async () => {
      console.log('🧪 Testing listing creation with missing required fields...');

      const { token } = await createAuthenticatedUser('miner');

      const incompleteData = {
        commodity_type: 'Gold',
        // Missing volume, origin_country, origin_region
        grade: 'High Grade',
        price_per_unit: 500
      };

      const response = await request(app)
        .post('/api/marketplace/minerals')
        .set('Authorization', `Bearer ${token}`)
        .send(incompleteData);

      console.log('📊 Missing fields response:', response.status);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/missing.*required.*fields/i);
      
      console.log('✅ Missing required fields test passed!');
    });

    test('should reject creation by unauthenticated user', async () => {
      console.log('🧪 Testing listing creation by unauthenticated user...');

      const listingData = {
        commodity_type: 'Gold',
        volume: 100.5,
        volume_unit: 'kg',
        grade: 'High Grade',
        origin_country: 'Australia',
        origin_region: 'Western Australia',
        price_per_unit: 500
      };

      const response = await request(app)
        .post('/api/marketplace/minerals')
        .send(listingData);

      console.log('📊 Unauthenticated creation response:', response.status);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/authentication.*required/i);
      
      console.log('✅ Unauthenticated creation test passed!');
    });

    test('should reject creation by unauthorized user role (buyer)', async () => {
      console.log('🧪 Testing listing creation by unauthorized user role...');

      const { token } = await createAuthenticatedUser('buyer');

      const listingData = {
        commodity_type: 'Gold',
        volume: 100.5,
        volume_unit: 'kg',
        grade: 'High Grade',
        origin_country: 'Australia',
        origin_region: 'Western Australia',
        price_per_unit: 500
      };

      const response = await request(app)
        .post('/api/marketplace/minerals')
        .set('Authorization', `Bearer ${token}`)
        .send(listingData);

      console.log('📊 Unauthorized role response:', response.status);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/insufficient.*permissions/i);
      
      console.log('✅ Unauthorized role test passed!');
    });
  });

  describe('GET /api/marketplace/minerals - Retrieving Mineral Listings', () => {
    let minerAuth: any;
    let testListings: any[] = [];

    beforeEach(async () => {
      // Create authenticated miner and some test listings
      minerAuth = await createAuthenticatedUser('miner');
      
      // Create multiple test listings for filtering/pagination tests
      const listings = [
        {
          commodity_type: 'Gold',
          volume: 100,
          price_per_unit: 500,
          origin_country: 'Australia'
        },
        {
          commodity_type: 'Silver',
          volume: 200,
          price_per_unit: 25,
          origin_country: 'Canada'
        },
        {
          commodity_type: 'Gold',
          volume: 50,
          price_per_unit: 600,
          origin_country: 'South Africa'
        }
      ];

      for (const listing of listings) {
        const { response } = await createTestListing(minerAuth.token, listing);
        testListings.push(response.body.listing);
      }
    });

    test('should retrieve all listings (basic fetch)', async () => {
      console.log('🧪 Testing basic retrieval of all listings...');

      const response = await request(app)
        .get('/api/marketplace/minerals');

      console.log('📊 All listings response:', response.status);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('listings');
      expect(response.body.listings).toBeInstanceOf(Array);
      expect(response.body.listings.length).toBeGreaterThanOrEqual(3);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      
      console.log('✅ Basic listings retrieval test passed!');
    });

    test('should retrieve listings with commodity_type filter', async () => {
      console.log('🧪 Testing listings retrieval with commodity_type filter...');

      const response = await request(app)
        .get('/api/marketplace/minerals?commodity_type=Gold');

      console.log('📊 Filtered listings response:', response.status);

      expect(response.status).toBe(200);
      expect(response.body.listings).toBeInstanceOf(Array);
      expect(response.body.listings.length).toBe(2); // Should have 2 Gold listings
      
      // Verify all returned listings are Gold
      response.body.listings.forEach((listing: any) => {
        expect(listing.commodity_type).toBe('Gold');
      });
      
      console.log('✅ Commodity type filter test passed!');
    });

    test('should retrieve listings with price range filter', async () => {
      console.log('🧪 Testing listings retrieval with price range filter...');

      const response = await request(app)
        .get('/api/marketplace/minerals?min_price=100&max_price=550');

      console.log('📊 Price filtered listings response:', response.status);

      expect(response.status).toBe(200);
      expect(response.body.listings).toBeInstanceOf(Array);
      // Verify all listings are within price range
      response.body.listings.forEach((listing: any) => {
        expect(parseFloat(listing.price_per_unit)).toBeGreaterThanOrEqual(100);
        expect(parseFloat(listing.price_per_unit)).toBeLessThanOrEqual(550);
      });      
      console.log('✅ Price range filter test passed!');
    });

    test('should retrieve listings with origin_location filter', async () => {
      console.log('🧪 Testing listings retrieval with origin_location filter...');

      const response = await request(app)
        .get('/api/marketplace/minerals?origin_location=Australia');

      console.log('📊 Origin filtered listings response:', response.status);

      expect(response.status).toBe(200);
      expect(response.body.listings).toBeInstanceOf(Array);
      expect(response.body.listings.length).toBe(1); // Should have 1 Australian listing
      
      // Verify returned listing is from Australia
      expect(response.body.listings[0].origin_location).toBe('Australia');
      
      console.log('✅ Origin location filter test passed!');
    });

    test('should retrieve listings with available_only filter', async () => {
      console.log('🧪 Testing listings retrieval with available_only filter...');

      const response = await request(app)
        .get('/api/marketplace/minerals?available_only=true');

      console.log('📊 Available only listings response:', response.status);

      expect(response.status).toBe(200);
      expect(response.body.listings).toBeInstanceOf(Array);
      
      // Verify all returned listings are available
      response.body.listings.forEach((listing: any) => {
        expect(listing.available).toBe(true);
      });
      
      console.log('✅ Available only filter test passed!');
    });

    test('should handle pagination correctly', async () => {
      console.log('🧪 Testing listings pagination...');

      // Test first page
      const page1Response = await request(app)
        .get('/api/marketplace/minerals?page=1&limit=2');

      console.log('📊 Page 1 response:', page1Response.status);

      expect(page1Response.status).toBe(200);
      expect(page1Response.body.listings).toBeInstanceOf(Array);
      expect(page1Response.body.listings.length).toBeLessThanOrEqual(2);
      expect(page1Response.body.pagination.page).toBe(1);
      expect(page1Response.body.pagination.limit).toBe(2);

      // Test second page
      const page2Response = await request(app)
        .get('/api/marketplace/minerals?page=2&limit=2');

      console.log('📊 Page 2 response:', page2Response.status);

      expect(page2Response.status).toBe(200);
      expect(page2Response.body.listings).toBeInstanceOf(Array);
      expect(page2Response.body.pagination.page).toBe(2);
      expect(page2Response.body.pagination.limit).toBe(2);
      
      console.log('✅ Pagination test passed!');
    });

    test('should allow unauthenticated users to retrieve listings', async () => {
      console.log('🧪 Testing listings retrieval by unauthenticated user...');

      const response = await request(app)
        .get('/api/marketplace/minerals');

      console.log('📊 Unauthenticated listings response:', response.status);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('listings');
      expect(response.body.listings).toBeInstanceOf(Array);
      
      console.log('✅ Unauthenticated listings test passed!');
    });

    test('should allow unauthenticated users to retrieve single listing', async () => {
      console.log('🧪 Testing single listing retrieval by unauthenticated user...');

      // Create a test listing first
      const tempMiner = await createAuthenticatedUser('miner');
      const { response: createResponse } = await createTestListing(tempMiner.token);
      const testListing = createResponse.body.listing;

      const response = await request(app)
        .get(`/api/marketplace/minerals/${testListing.id}`);

      console.log('📊 Unauthenticated single retrieval response:', response.status);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('listing');
      expect(response.body.listing.id).toBe(testListing.id);
      
      console.log('✅ Unauthenticated single listing test passed!');
    });
  });

  describe('PUT /api/marketplace/minerals/:id - Updating Mineral Listings', () => {
    let minerAuth: any;
    let otherSellerAuth: any;
    let testListing: any;

    beforeEach(async () => {
      minerAuth = await createAuthenticatedUser('miner');
      otherSellerAuth = await createAuthenticatedUser('buyer');
      const { response } = await createTestListing(minerAuth.token);
      testListing = response.body.listing;
    });

    test('should successfully update listing by its owner', async () => {
      console.log('🧪 Testing listing update by owner...');

      const updateData = {
        commodity_type: 'Platinum',
        volume: 75.5,
        grade: 'Premium Grade',
        price_per_unit: 800,
        description: 'Updated premium platinum ore'
      };

      const response = await request(app)
        .put(`/api/marketplace/minerals/${testListing.id}`)
        .set('Authorization', `Bearer ${minerAuth.token}`)
        .send(updateData);

      console.log('📊 Listing update response:', response.status);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('listing');
      expect(response.body.listing.commodity_type).toBe(updateData.commodity_type);
      expect(parseFloat(response.body.listing.volume)).toBe(updateData.volume);
      expect(response.body.listing.grade).toBe(updateData.grade);
      expect(parseFloat(response.body.listing.price_per_unit)).toBe(updateData.price_per_unit);
      expect(response.body.listing.description).toBe(updateData.description);

      // Verify update in database
      const client = await testPool.connect();
      const dbResult = await client.query(
        'SELECT * FROM mineral_listings WHERE id = $1',
        [testListing.id]
      );
      client.release();

      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].commodity_type).toBe(updateData.commodity_type);
      expect(parseFloat(dbResult.rows[0].volume)).toBe(updateData.volume);
      
      console.log('✅ Listing update by owner test passed!');
    });

    test('should reject update with invalid data', async () => {
      console.log('🧪 Testing listing update with invalid data...');

      const invalidData = {
        volume: -50, // Invalid negative volume
        price_per_unit: 'invalid_price' // Invalid price format
      };

      const response = await request(app)
        .put(`/api/marketplace/minerals/${testListing.id}`)
        .set('Authorization', `Bearer ${minerAuth.token}`)
        .send(invalidData);

      console.log('📊 Invalid update response:', response.status);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      
      console.log('✅ Invalid data update test passed!');
    });

    test('should return 404 for non-existent listing', async () => {
      console.log('🧪 Testing update of non-existent listing...');

      const nonExistentId = 99999;
      const updateData = {
        commodity_type: 'Silver',
        volume: 100
      };

      const response = await request(app)
        .put(`/api/marketplace/minerals/${nonExistentId}`)
        .set('Authorization', `Bearer ${minerAuth.token}`)
        .send(updateData);

      console.log('📊 Non-existent update response:', response.status);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/listing.*not.*found/i);
      
      console.log('✅ Non-existent listing update test passed!');
    });

    test('should reject update by unauthenticated user', async () => {
      console.log('🧪 Testing listing update by unauthenticated user...');

      const updateData = {
        commodity_type: 'Silver',
        volume: 100
      };

      const response = await request(app)
        .put(`/api/marketplace/minerals/${testListing.id}`)
        .send(updateData);

      console.log('📊 Unauthenticated update response:', response.status);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/authentication.*required/i);
      
      console.log('✅ Unauthenticated update test passed!');
    });

    test('should reject update by non-owner (403 Forbidden)', async () => {
      console.log('🧪 Testing listing update by non-owner...');

      const updateData = {
        commodity_type: 'Silver',
        volume: 100
      };

      const response = await request(app)
        .put(`/api/marketplace/minerals/${testListing.id}`)
        .set('Authorization', `Bearer ${otherSellerAuth.token}`)
        .send(updateData);

      console.log('📊 Non-owner update response:', response.status);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/insufficient.*permissions/i);
      
      console.log('✅ Non-owner update test passed!');
    });
  });

  describe('DELETE /api/marketplace/minerals/:id - Deleting Mineral Listings', () => {
    let minerAuth: any;
    let otherSellerAuth: any;
    let testListing: any;

    beforeEach(async () => {
      minerAuth = await createAuthenticatedUser('miner');
      otherSellerAuth = await createAuthenticatedUser('buyer');
      const { response } = await createTestListing(minerAuth.token);
      testListing = response.body.listing;
    });

    test('should successfully delete listing by its owner', async () => {
      console.log('🧪 Testing listing deletion by owner...');

      const response = await request(app)
        .delete(`/api/marketplace/minerals/${testListing.id}`)
        .set('Authorization', `Bearer ${minerAuth.token}`);

      console.log('📊 Listing deletion response:', response.status);

      expect(response.status).toBe(204);

      // Verify deletion in database
      const client = await testPool.connect();
      const dbResult = await client.query(
        'SELECT * FROM mineral_listings WHERE id = $1',
        [testListing.id]
      );
      client.release();

      expect(dbResult.rows).toHaveLength(0);
      
      console.log('✅ Listing deletion by owner test passed!');
    });

    test('should return 404 for non-existent listing', async () => {
      console.log('🧪 Testing deletion of non-existent listing...');

      const nonExistentId = 99999;
      const response = await request(app)
        .delete(`/api/marketplace/minerals/${nonExistentId}`)
        .set('Authorization', `Bearer ${minerAuth.token}`);

      console.log('📊 Non-existent deletion response:', response.status);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/listing.*not.*found/i);
      
      console.log('✅ Non-existent listing deletion test passed!');
    });

    test('should reject deletion by unauthenticated user', async () => {
      console.log('🧪 Testing listing deletion by unauthenticated user...');

      const response = await request(app)
        .delete(`/api/marketplace/minerals/${testListing.id}`);

      console.log('📊 Unauthenticated deletion response:', response.status);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/authentication.*required/i);
      
      console.log('✅ Unauthenticated deletion test passed!');
    });

    test('should reject deletion by non-owner (403 Forbidden)', async () => {
      console.log('🧪 Testing listing deletion by non-owner...');

      const response = await request(app)
        .delete(`/api/marketplace/minerals/${testListing.id}`)
        .set('Authorization', `Bearer ${otherSellerAuth.token}`);

      console.log('📊 Non-owner deletion response:', response.status);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/insufficient.*permissions/i);
      
      console.log('✅ Non-owner deletion test passed!');
    });
  });

  describe('Complete Marketplace Workflow - End-to-End', () => {
    test('should complete full marketplace workflow: create → retrieve → update → delete', async () => {
      console.log('🧪 Testing complete marketplace workflow...');

      // Step 1: Create authenticated miner
      console.log('📝 Step 1: Creating authenticated miner...');
      const { token, user } = await createAuthenticatedUser('miner');

      // Step 2: Create mineral listing
      console.log('📝 Step 2: Creating mineral listing...');
      const { response: createResponse } = await createTestListing(token, {
        commodity_type: 'Diamond',
        volume: 10,
        grade: 'Gem Quality',
        price_per_unit: 5000
      });

      expect(createResponse.status).toBe(201);
      const listingId = createResponse.body.listing.id;

      // Step 3: Retrieve the listing
      console.log('📝 Step 3: Retrieving the listing...');
      const retrieveResponse = await request(app)
        .get(`/api/marketplace/minerals/${listingId}`)
        .expect(200);

      expect(retrieveResponse.body.listing.commodity_type).toBe('Diamond');

      // Step 4: Update the listing
      console.log('📝 Step 4: Updating the listing...');
      const updateResponse = await request(app)
        .put(`/api/marketplace/minerals/${listingId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          commodity_type: 'Ruby',
          volume: 15,
          price_per_unit: 6000
        })
        .expect(200);

      expect(updateResponse.body.listing.commodity_type).toBe('Ruby');
      expect(parseFloat(updateResponse.body.listing.volume)).toBe(15);

      // Step 5: Delete the listing
      console.log('📝 Step 5: Deleting the listing...');
      await request(app)
        .delete(`/api/marketplace/minerals/${listingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Step 6: Verify deletion
      console.log('📝 Step 6: Verifying deletion...');
      await request(app)
        .get(`/api/marketplace/minerals/${listingId}`)
        .expect(404);

      console.log('✅ Complete marketplace workflow test passed!');
    });

    test('should handle multiple miners with proper ownership isolation', async () => {
      console.log('🧪 Testing multiple miners with ownership isolation...');

      // Create two miners
      const miner1 = await createAuthenticatedUser('miner');
      const miner2 = await createAuthenticatedUser('miner');

      // Each miner creates a listing
      const { response: listing1Response } = await createTestListing(miner1.token, {
        commodity_type: 'Gold',
        volume: 100
      });

      const { response: listing2Response } = await createTestListing(miner2.token, {
        commodity_type: 'Silver',
        volume: 200
      });

      const listing1Id = listing1Response.body.listing.id;
      const listing2Id = listing2Response.body.listing.id;

      // Seller1 should not be able to update Seller2's listing
      const unauthorizedUpdateResponse = await request(app)
        .put(`/api/marketplace/minerals/${listing2Id}`)
        .set('Authorization', `Bearer ${miner1.token}`)
        .send({ volume: 150 });

      expect(unauthorizedUpdateResponse.status).toBe(403);

      // Seller1 should not be able to delete Seller2's listing
      const unauthorizedDeleteResponse = await request(app)
        .delete(`/api/marketplace/minerals/${listing2Id}`)
        .set('Authorization', `Bearer ${miner1.token}`);

      expect(unauthorizedDeleteResponse.status).toBe(403);

      // But each miner can manage their own listings
      await request(app)
        .put(`/api/marketplace/minerals/${listing1Id}`)
        .set('Authorization', `Bearer ${miner1.token}`)
        .send({ volume: 120 })
        .expect(200);

      await request(app)
        .delete(`/api/marketplace/minerals/${listing1Id}`)
        .set('Authorization', `Bearer ${miner1.token}`)
        .expect(204);

      console.log('✅ Multiple miners ownership isolation test passed!');
    });
  });
});

