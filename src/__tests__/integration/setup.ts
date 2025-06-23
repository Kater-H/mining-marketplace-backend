// Integration test configuration and setup utilities
import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

export class IntegrationTestSetup {
  private static pool: Pool;
  private static client: PoolClient;

  static async setupTestDatabase(): Promise<void> {
    try {
      // Use the main database configuration but with test environment
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'mining_marketplace',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      });

      // Get a client for setup operations
      this.client = await this.pool.connect();
      
      // Test the connection
      await this.client.query('SELECT NOW()');
      
      console.log('Test database connection established successfully');
    } catch (error) {
      console.error('Error setting up test database:', error);
      throw error;
    }
  }

  static async teardownTestDatabase(): Promise<void> {
    try {
      if (this.client) {
        this.client.release();
      }
      if (this.pool) {
        await this.pool.end();
      }
      console.log('Test database connection closed successfully');
    } catch (error) {
      console.error('Error tearing down test database:', error);
      throw error;
    }
  }

  static getClient(): PoolClient {
    if (!this.client) {
      throw new Error('Test database not initialized. Call setupTestDatabase() first.');
    }
    return this.client;
  }

  static getPool(): Pool {
    if (!this.pool) {
      throw new Error('Test database not initialized. Call setupTestDatabase() first.');
    }
    return this.pool;
  }

  // Helper method to create a test user directly in the database
  static async createTestUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    isVerified?: boolean;
  }): Promise<any> {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const result = await this.client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, first_name, last_name, role, is_verified`,
      [
        userData.email,
        hashedPassword,
        userData.firstName,
        userData.lastName,
        userData.role,
        userData.isVerified || false
      ]
    );
    
    return result.rows[0];
  }

  // Safe cleanup method that only removes test data
  static async cleanupTestData(): Promise<void> {
    try {
      // Only delete users with test email domains to avoid affecting real data
      await this.client.query(`
        DELETE FROM users 
        WHERE email LIKE '%@example.com' 
           OR email LIKE '%@test.com'
           OR email LIKE '%test%'
      `);
      
      // Reset sequences for test data
      await this.client.query(`
        SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1))
      `);
      
      console.log('Test data cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up test data:', error);
      // Don't throw error to avoid breaking test teardown
    }
  }
}

// Test fixtures for consistent test data
export const testFixtures = {
  validUser: {
    email: 'test@example.com',
    password: 'SecurePassword123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'buyer'
  },
  validMiner: {
    email: 'miner@example.com',
    password: 'MinerPassword123!',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'miner'
  },
  validAdmin: {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  }
};

