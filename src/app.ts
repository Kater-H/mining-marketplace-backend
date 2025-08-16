// src/app.ts (or src/server.ts, depending on your project structure)

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// --- Import your routes with the CORRECT export style ---
// Based on the files provided and previous errors:
// - userRoutes uses 'export const userRoutes = router;' (named export)
// - paymentRoutes uses 'export default router;' (default export)
// - For others (authRoutes, listingRoutes, offerRoutes, marketplaceRoutes),
//   we'll assume they use named exports ({ router as X }) based on previous fixes.

import { router as authRoutes } from './routes/authRoutes.js';
import { router as userRoutes } from './routes/userRoutes.js';
import { router as listingRoutes } from './routes/listingRoutes.js';
import { router as offerRoutes } from './routes/offerRoutes.js'; 
import paymentRoutesRouter from './routes/paymentRoutes.js'; 
import { router as marketplaceRoutes } from './routes/marketplaceRoutes.js';


import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// --- NEW: Add this line to trust proxy headers for Render ---
app.set('trust proxy', 1); // 1 means trust the first proxy, which is Render's load balancer

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
app.use('/api/marketplace', marketplaceRoutes); // Marketplace routes are now nested under this
app.use('/api/payments', paymentRoutesRouter);

// We no longer need this line because we are mounting `offerRoutes`
// inside `marketplaceRoutes.ts` to prevent double-mounting.
// app.use('/api/marketplace/offers', offerRoutes);


app.get('/', (req, res) => {
  res.status(200).send('Mining Marketplace Backend API is running!');
});

app.use(errorHandler);

export default app;
