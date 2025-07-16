// src/server.ts
import app from './app.js'; // Import the Express application instance
import { config } from './config/config.js'; // Import your configuration

const PORT = config.port;

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
  // For a graceful shutdown, you might close database connections, etc.
  // process.exit(1); // Exit with a failure code
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Application specific logging, throwing an error, or other logic here
  // For a graceful shutdown, you might close database connections, etc.
  // process.exit(1); // Exit with a failure code
});
