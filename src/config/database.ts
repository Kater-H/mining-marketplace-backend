import { Pool } from 'pg'; // Explicitly import Pool
import { config } from './config';

let pool: Pool;

// Function to get or initialize the PostgreSQL connection pool
export const getPool = (): Pool => {
  if (!pool) {
    console.log('Initializing PostgreSQL connection pool...');
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: {
        rejectUnauthorized: false // Use this for Render PostgreSQL, but be cautious in production
      }
    });

    // Ensure 'pool' is correctly typed as Pool (which has 'on')
    (pool as Pool).on('error', (err) => { // Added type assertion for robustness
      console.error('Unexpected error on idle client', err);
      process.exit(-1); // Exit process if client connection is lost
    });

    console.log('PostgreSQL pool initialized successfully.');
  }
  return pool;
};

// Optional: Function to close the pool (useful for graceful shutdown)
export const closePool = async (): Promise<void> => {
  if (pool) {
    console.log('Closing PostgreSQL connection pool...');
    await pool.end();
    console.log('PostgreSQL pool closed.');
  }
};

// Export pgPool for direct use in services (alternative to getPool())
export const pgPool = getPool();
