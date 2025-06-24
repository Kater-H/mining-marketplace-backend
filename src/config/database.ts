import { Pool } from 'pg';
import { config } from './config';

let poolInstance: Pool;

// Function to get or initialize the PostgreSQL connection pool
export const getPool = (): Pool => {
  if (!poolInstance) {
    console.log('Initializing PostgreSQL connection pool...');
    poolInstance = new Pool({
      connectionString: config.databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // CHANGED: Cast to 'any' for the 'on' method to bypass strict type checking
    (poolInstance as any).on('error', (err: Error) => { // Added type for 'err' for clarity
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });

    console.log('PostgreSQL pool initialized successfully.');
  }
  return poolInstance;
};

// Optional: Function to close the pool (useful for graceful shutdown)
export const closePool = async (): Promise<void> => {
  if (poolInstance) {
    console.log('Closing PostgreSQL connection pool...');
    await poolInstance.end();
    console.log('PostgreSQL pool closed.');
  }
};

// Export pgPool for direct use in services (alternative to getPool())
export const pgPool = getPool();
