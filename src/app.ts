// src/app.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit'; // Using express-rate-limit
import { config } from './config/config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ApplicationError } from './utils/applicationError.js';
import { healthRoutes } from './routes/healthRoutes.js';
import { userRoutes } from './routes/userRoutes.js';
import { marketplaceRoutes } from './routes/marketplaceRoutes.js'; // Assuming this is your listing routes
import { offerRoutes } from './routes/offerRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js'; // Assuming this is default export
import { generalRateLimit } from './middleware/rateLimiter.js'; // Assuming you named your rate limiter instance 'generalRateLimit'
import { compression } from './middleware/compression.js'; // Import the compression middleware

const app = express();

// Security Middlewares
app.use(helmet()); // Set various HTTP headers for security

// CORS Configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = config.corsAllowedOrigins.split(',');
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new ApplicationError(msg, 403), false);
    }
    return callback(null, true);
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204, // For preflight requests
};
app.use(cors(corsOptions));

// Request Logging
app.use(morgan('dev')); // 'dev' for concise output colored by status

// Body Parsers
app.use(express.json({ limit: '10mb' })); // For JSON bodies, with a limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // For URL-encoded bodies

// Compression Middleware
app.use(compression.middleware()); // Use the compression middleware

// Rate Limiting (apply to all requests or specific routes)
app.use(generalRateLimit.middleware()); // Apply general rate limiting

// --- API Routes ---
// NEW: Basic root route for health check / API status
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Mining Marketplace API is running!' });
});

app.use('/api/health', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/marketplace/listings', marketplaceRoutes); // Mount listing routes under /api/marketplace/listings
app.use('/api/marketplace/offers', offerRoutes); // Mount offer routes under /api/marketplace/offers
app.use('/api/payments', paymentRoutes); // Mount payment routes under /api/payments

// Catch-all for 404 Not Found
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new ApplicationError(`Resource not found: ${req.originalUrl}`, 404));
});

// Global Error Handler
app.use(errorHandler);

export default app;
