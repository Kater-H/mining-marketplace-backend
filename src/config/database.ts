import { Pool } from 'pg'; // Explicitly import Pool type from pg
import { config } from './config';

let poolInstance: Pool; // Renamed to avoid confusion with the Pool type constructor itself

// Function to get or initialize the PostgreSQL connection pool
export const getPool = (): Pool => {
  if (!poolInstance) {
    console.log('Initializing PostgreSQL connection pool...');
    poolInstance = new Pool({ // Instantiate the Pool
      connectionString: config.databaseUrl,
      ssl: {
        rejectUnauthorized: false // Use this for Render PostgreSQL, but be cautious in production
      }
    });

    // Directly use the 'on' method. TypeScript should now correctly recognize it.
    poolInstance.on('error', (err) => { // No need for 'as Pool' if typed correctly at declaration
      console.error('Unexpected error on idle client', err);
      process.exit(-1); // Exit process if client connection is lost
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
