// src/config/config.ts
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

export const config = {
  port: parseInt(process.env.PORT || '10000', 10),
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkey',
  // Increased JWT expiration to 7 days for better user experience.
  // This helps maintain login state across redirects and longer sessions.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d', // Changed from '1h' or similar
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@host:port/database',
  emailService: {
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || 'user@ethereal.email',
      pass: process.env.EMAIL_PASS || 'password',
    },
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_STRIPE_SECRET_KEY',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_YOUR_WEBHOOK_SECRET',
  logLevel: process.env.LOG_LEVEL || 'info',
  corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000', // Default for local dev
};

// You should also define an interface for your config object for better type safety
export interface AppConfig {
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  databaseUrl: string;
  emailService: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  frontendUrl: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  logLevel: string;
  corsAllowedOrigins: string;
}
