import 'dotenv/config'; // External module, no .js
import express, { Express, Request, Response, NextFunction } from 'express'; // External module, no .js
import helmet from 'helmet'; // External module, no .js
import cors from 'cors'; // External module, no .js
import morgan from 'morgan'; // External module, no .js
import rateLimit from 'express-rate-limit'; // External module, no .js

import { healthRoutes } from './routes/healthRoutes.js'; // ADDED .js
import { userRoutes } from './routes/userRoutes.js'; // ADDED .js
import marketplaceRoutes from './routes/marketplaceRoutes.js'; // CHANGED: Default import
import { paymentRoutes } from './routes/paymentRoutes.js'; // ADDED .js

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
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*', // Adjust in production
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
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


// Basic error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
