// src/app.ts (or src/server.ts, depending on your project structure)

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// --- Import your routes ---
// IMPORTANT: Choose ONE of the options below based on how your route files export their routers.
// If a route file uses 'export default router;', use the 'import X from Y;' style.
// If a route file uses 'export const router = Router();' or 'export { router };', use 'import { router as X } from Y;' style.

// Option A: Use this if ALL your route files use 'export default router;'
// If you have mixed exports, you will need to mix these import styles accordingly.
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import marketplaceRoutes from './routes/marketplaceRoutes.js';


// Option B: Use this if ALL your route files use 'export const router = Router();' or 'export { router };'
// If you have mixed exports, you will need to mix these import styles accordingly.
// For example, if authRoutes uses default, but userRoutes uses named:
// import authRoutes from './routes/authRoutes.js';
// import { router as userRoutes } from './routes/userRoutes.js';
// import { router as listingRoutes } from './routes/listingRoutes.js';
// import { router as offerRoutes } from './routes/offerRoutes.js';
// import { router as paymentRoutes } from './routes/paymentRoutes.js';
// import { router as marketplaceRoutes } from './routes/marketplaceRoutes.js';


import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://mining-marketplace-frontend-XXXX.onrender.com', // Replace with your actual Render frontend URL
  // Add any other frontend URLs that need to access this backend
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use(limiter);


// --- Apply Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/marketplace', marketplaceRoutes);
// If you have individual routes not aggregated by marketplaceRoutes:
// app.use('/api/listings', listingRoutes);
// app.use('/api/offers', offerRoutes);
// app.use('/api/payments', paymentRoutes);


app.get('/', (req, res) => {
  res.status(200).send('Mining Marketplace Backend API is running!');
});

app.use(errorHandler);

export default app;
