    // src/app.ts
    import express, { Request, Response, NextFunction } from 'express';
    import cors from 'cors';
    import helmet from 'helmet';
    import morgan from 'morgan';
    import rateLimit from 'express-rate-limit'; // <-- Corrected import for express-rate-limit
    import compression from 'compression'; // <-- Corrected import for compression
    import { config } from './config/config.js';
    import { errorHandler } from './middleware/errorHandler.js';
    import { ApplicationError } from './utils/applicationError.js';
    import { healthRoutes } from './routes/healthRoutes.js';
    import { userRoutes } from './routes/userRoutes.js';
    import { marketplaceRoutes } from './routes/marketplaceRoutes.js';
    import { offerRoutes } from './routes/offerRoutes.js';
    import paymentRoutes from './routes/paymentRoutes.js';

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

    // Compression Middleware (using the npm package)
    app.use(compression()); // <-- Use the compression npm package

    // Rate Limiting (using the npm package)
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again after 15 minutes',
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });
    app.use(limiter); // <-- Apply the rate limiter

    // --- API Routes ---
    // Basic root route for health check / API status
    app.get('/', (req: Request, res: Response) => {
      res.status(200).json({ message: 'Mining Marketplace API is running!' });
    });

    app.use('/api/health', healthRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/marketplace/listings', marketplaceRoutes);
    app.use('/api/marketplace/offers', offerRoutes);
    app.use('/api/payments', paymentRoutes);

    // Catch-all for 404 Not Found
    app.use((req: Request, res: Response, next: NextFunction) => {
      next(new ApplicationError(`Resource not found: ${req.originalUrl}`, 404));
    });

    // Global Error Handler
    app.use(errorHandler);

    export default app;
    