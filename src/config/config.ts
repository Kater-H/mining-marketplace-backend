import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key', // Consider a stronger default or error if not set
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@host:port/database', // Stronger default or error
  emailService: {
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // Use 'true' or 'false' string
    auth: {
      user: process.env.EMAIL_USER || 'user@example.com',
      pass: process.env.EMAIL_PASS || 'password',
    },
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173', // Default for local frontend development

  // ADDED: Stripe Configuration
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '', // Make sure this is set in production
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '', // Make sure this is set in production

  // Flutterwave Configuration (if you plan to use it)
  flutterwavePublicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || '',
  flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY || '',
  flutterwaveWebhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET || '',
};
