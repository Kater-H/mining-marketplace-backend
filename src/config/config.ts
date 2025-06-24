// Assuming no local imports with .ts are needed in this file
export const config = {
    port: process.env.PORT || 3000,
    databaseUrl: process.env.DATABASE_URL || 'postgres://user:password@host:port/database',
    jwtSecret: process.env.JWT_SECRET || 'your-very-strong-jwt-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_STRIPE_SECRET_KEY',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_YOUR_STRIPE_WEBHOOK_SECRET',
    flutterwavePublicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-X',
    flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-X',
    discordBotToken: process.env.DISCORD_BOT_TOKEN || 'YOUR_DISCORD_BOT_TOKEN', // For monitoring/notifications
    discordChannelId: process.env.DISCORD_CHANNEL_ID || 'YOUR_DISCORD_CHANNEL_ID', // For monitoring/notifications
    logLevel: process.env.LOG_LEVEL || 'info' // ADDED: Default log level
};
