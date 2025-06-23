import { Pool } from 'pg';

import * as dotenv from 'dotenv';



// Load environment variables

dotenv.config();



// Create a PostgreSQL connection pool

export const pgPool = new Pool({

  host: process.env.DB_HOST || 'localhost',

  port: parseInt(process.env.DB_PORT || '5432'),

  user: process.env.DB_USER || 'postgres',

  password: process.env.DB_PASSWORD || 'postgres',

  database: process.env.DB_NAME || 'mining_marketplace'

});



// Export a function to get the appropriate pool

// This allows tests to override the pool with their test database

export const getPool = (): Pool => {

  // @ts-ignore - Check for test database pool

  if (global.__TEST_DB_POOL) {

    // @ts-ignore - Use test database pool if available

    return global.__TEST_DB_POOL;

  }

  return pgPool;

};