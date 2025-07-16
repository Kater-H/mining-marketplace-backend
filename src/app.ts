import 'dotenv/config'; // External module, no .js
import express, { Express, Request, Response, NextFunction } from 'express'; // External module, no .js
import helmet from 'helmet'; // External module, no .js
import cors from 'cors'; // External module, no .js
import morgan from 'morgan'; // External module, no .js
import rateLimit from 'express-rate-limit'; // External module, no .js

import { healthRoutes } from './routes/healthRoutes.js';
import { userRoutes } from './routes/userRoutes.js';
import marketplaceRoutes from './routes/marketplaceRoutes.js';
import { paymentRoutes } from './routes/paymentRoutes.js';
import { errorHandler } from './middleware/errorHandler.js'; // IMPORT YOUR CUSTOM ERROR HANDLER
import { ApplicationError } from './utils/applicationError.js'; // IMPORT ApplicationError

const app: Express = express();
const PORT = process.env.PORT || 3000;

// --- GLOBAL REQUEST LOGGER (VERY FIRST MIDDLEWARE) ---
app.use((req, res, next) => {
  console.log(`⚡️ GLOBAL LOGGER: Incoming Request - Method: ${req.method}, URL: ${req.url}, IP: ${req.ip}`);
  next();
});
// --- END GLOBAL REQUEST LOGGER ---

// Security Middleware
app.use(helmet());

// CORS Configuration
// In development, allow localhost. In production, use the actual frontend URL.
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CORS_ORIGIN || 'https://mining-marketplace-frontend-your-render-url.onrender.com'] // Replace with your actual frontend Render URL
  : ['http://localhost:5173', 'http://127.0.0.1:5173']; // Add other local dev origins if needed

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Logging Middleware (morgan) - Keep this as well, it provides more detail
app.use(morgan('dev'));

// Rate Limiting - RE-ENABLED
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(apiLimiter);

// Body Parser for JSON (re-enabled, removed global verify function)
// This must come BEFORE any other body parsing middleware for JSON requests
app.use(express.json());

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/payments', paymentRoutes);

// Catch-all for 404 - IMPORTANT: This should come BEFORE the general errorHandler
app.use((req, res, next) => {
  next(new ApplicationError('Not Found', 404));
});

// Global Error Handling Middleware - MUST BE THE VERY LAST middleware registered
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
