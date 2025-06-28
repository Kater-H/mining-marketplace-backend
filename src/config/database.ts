import { Pool } from 'pg'; // External module, no .js
import { config } from './config.js'; // ADDED .js

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

    (poolInstance as any).on('error', (err: Error) => {
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
