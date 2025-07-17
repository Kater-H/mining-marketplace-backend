import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10), // Ensure port is a number
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_fallback', // Ensure this is a string
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h', // Ensure this is a string
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@host:port/database', 
  emailService: {
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true', 
    auth: {
      user: process.env.EMAIL_USER || 'user@example.com',
      pass: process.env.EMAIL_PASS || 'password',
    },
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Stripe Configuration
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '', 
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '', 

  // Flutterwave Configuration (if you plan to use it)
  flutterwavePublicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || '',
  flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY || '',
  flutterwaveWebhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET || '',

  // ADDED: For Logger Configuration
  logLevel: process.env.LOG_LEVEL || 'info',
};
