import { config } from '../config.js'; // ADDED .js
// Assuming this file also needs imports for winston or other logging libraries

// This is a basic logger. You might use a library like Winston for production.
export const logger = {
  info: (message: string, ...args: any[]) => {
    if (config.logLevel === 'info' || config.logLevel === 'debug') {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (config.logLevel === 'info' || config.logLevel === 'warn' || config.logLevel === 'debug') {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (config.logLevel === 'debug') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
};
