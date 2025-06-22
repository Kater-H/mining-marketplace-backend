// Jest setup file for test environment initialization
// This file runs before each test file is executed

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_purposes_only';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'mining_marketplace_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/mining_marketplace_test';

// Payment provider test keys
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_webhook_secret';
process.env.FLUTTERWAVE_SECRET_KEY = 'FLWSECK_TEST-fake_key_for_testing';

// Email configuration (mock)
process.env.EMAIL_HOST = 'smtp.test.com';
process.env.EMAIL_PORT = '587';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASSWORD = 'test_password';
process.env.EMAIL_FROM = 'noreply@miningmarketplace.test';

// Test timeouts
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Helper to create test user data
  createTestUser: (role = 'buyer') => ({
    email: `${role}${Date.now()}@example.com`,
    password: 'SecurePassword123!',
    first_name: 'Test',
    last_name: 'User',
    role: role,
  }),
  
  // Helper to create test listing data
  createTestListing: () => ({
    commodity_type: 'Gold',
    volume: 100.5,
    volume_unit: 'kg',
    grade: 'High Grade',
    origin_country: 'Australia',
    origin_region: 'Western Australia',
    price_per_unit: 500,
    price_currency: 'USD',
    description: 'High quality gold ore from Western Australia',
  }),
  
  // Helper to create test payment data
  createTestPayment: (listingId) => ({
    amount: 50000,
    currency: 'USD',
    listing_id: listingId,
  }),
};

// Mock console methods in CI environment to reduce noise
if (process.env.CI === 'true') {
  // Keep error and warn for debugging
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.log = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
  
  // Preserve error and warn but filter out known test noise
  console.error = (...args) => {
    const message = args.join(' ');
    // Filter out known test-related errors that are expected
    if (
      message.includes('Jest worker encountered') ||
      message.includes('A worker process has failed') ||
      message.includes('Force exiting Jest')
    ) {
      return;
    }
    originalError.apply(console, args);
  };
  
  console.warn = (...args) => {
    const message = args.join(' ');
    // Filter out known warnings
    if (
      message.includes('ts-jest') ||
      message.includes('isolatedModules')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Cleanup function for after all tests
afterAll(async () => {
  // Close any open database connections
  if (global.pgPool) {
    await global.pgPool.end();
  }
  
  // Clear any timers
  jest.clearAllTimers();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

