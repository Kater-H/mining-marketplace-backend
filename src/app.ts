// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { userRoutes } from './routes/userRoutes.js'; 
// Corrected to named import for marketplaceRoutes
import { marketplaceRoutes } from './routes/marketplaceRoutes.js'; 
// Corrected to named import for paymentRoutes
import { paymentRoutes } from './routes/paymentRoutes.js'; 
// Corrected to named import for offerRoutes
import { offerRoutes } from './routes/offerRoutes.js'; 
import { ApplicationError } from './utils/applicationError.js';

const app = express();

// Security Middleware
app.use(helmet());

// Logger Middleware
app.use(morgan('dev'));

// Body Parser Middleware
app.use(express.json({
  verify: (req, res, buf) => {
    if ((req as any).originalUrl === '/api/payments/webhook') {
      (req as any).rawBody = buf;
    }
  },
}));

// CORS Configuration - Allow multiple origins
const allowedOrigins = config.frontendUrl.split(',').map(url => url.trim());

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));


// Routes
app.use('/api/users', userRoutes); 
app.use('/api/marketplace/listings', marketplaceRoutes); // Using named import
app.use('/api/marketplace/offers', offerRoutes); // Using named import
app.use('/api/payments', paymentRoutes); // Using named import

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is healthy and running!' });
});

// 404 Not Found Handler
app.use((req, res, next) => {
  next(new ApplicationError('Resource not found', 404));
});

// Global Error Handler
app.use(errorHandler);

export default app;
