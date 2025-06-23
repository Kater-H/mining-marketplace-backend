import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Configuration object for the application.
 * Retrieves values from environment variables with default fallbacks.
 */
export const config = {
  // Application settings
  port: process.env.PORT || 4000,
  env: process.env.NODE_ENV || 'development',

  // Database settings (already in database.ts, but good to have a central reference if needed)
  // dbHost: process.env.DB_HOST || 'localhost',
  // dbPort: parseInt(process.env.DB_PORT || '5432'),
  // dbUser: process.env.DB_USER || 'postgres',
  // dbPassword: process.env.DB_PASSWORD || 'postgres',
  // dbName: process.env.DB_NAME || 'mining_marketplace',

  // JWT settings for authentication
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkeyforprod', // **IMPORTANT: Use a strong, unique secret in production**
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d', // e.g., '1h', '7d'

  // Stripe Payment Gateway settings
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_STRIPE_SECRET_KEY', // **IMPORTANT: Replace with your actual secret key**
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_YOUR_STRIPE_WEBHOOK_SECRET', // **IMPORTANT: Replace with your actual webhook secret**

  // Flutterwave Payment Gateway settings
  flutterwavePublicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-X', // **IMPORTANT: Replace with your actual public key**
  flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-X', // **IMPORTANT: Replace with your actual secret key**
  flutterwaveEncryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY || 'FLWSECK_TEST-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-X', // **IMPORTANT: Replace with your actual encryption key if needed for verification**

  // Notification settings
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',

  // Logger settings
  logLevel: process.env.LOG_LEVEL || 'info', // e.g., 'debug', 'info', 'warn', 'error'

  // General application settings
  logoUrl: process.env.APP_LOGO_URL || 'https://example.com/logo.png', // Default logo URL for Flutterwave or other uses
};
