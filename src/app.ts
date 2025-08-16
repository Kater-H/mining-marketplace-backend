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
import { router as offerRoutes } from './routes/offerRoutes.js'; // This is the one we need to mount
import paymentRoutesRouter from './routes/paymentRoutes.js'; // <--- CORRECTED: Default import for paymentRoutes
import { router as marketplaceRoutes } from './routes/marketplaceRoutes.js';


import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// --- NEW: Add this line to trust proxy headers for Render ---
app.set('trust proxy', 1); // 1 means trust the first proxy

// --- CORS Configuration ---
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://mining-marketplace-frontend-pig6.onrender.com' // <-- ADDED: The new frontend URL
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
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
app.use('/api/marketplace', marketplaceRoutes); // This mounts marketplaceRoutes at /api/marketplace
app.use('/api/payments', paymentRoutesRouter);

// NEW: Mount offerRoutes directly under /api/marketplace/offers
// This assumes that offerRoutes.ts exports 'router'
app.use('/api/marketplace/offers', offerRoutes);

// --- Error Handler Middleware ---
app.use(errorHandler);


// --- Server Listener ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// IMPORTANT: Now we export the app as a default export
export default app;
