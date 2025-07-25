// src/app.ts (or src/server.ts, depending on your project structure)

import express from 'express';
import cors from 'cors'; // Import cors
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import your routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import marketplaceRoutes from './routes/marketplaceRoutes.js'; // Assuming this aggregates other routes

import { errorHandler } from './middleware/errorHandler.js'; // Assuming you have a global error handler

dotenv.config(); // Load environment variables

const app = express();

// --- CORS Configuration ---
// This is critical for cross-origin requests from your frontend.
// Ensure this is placed early in your middleware chain.
const allowedOrigins = [
  'http://localhost:5173', // For local frontend development
  'http://localhost:3000', // Common React dev port
  'https://your-frontend-app-name.onrender.com', // Replace with your actual Render frontend URL
  // Add any other frontend URLs that need to access this backend
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow OPTIONS for preflight
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers
  credentials: true, // Allow cookies to be sent (if you use them for auth)
  optionsSuccessStatus: 204, // For preflight requests, return 204 No Content
};

app.use(cors(corsOptions)); // Apply CORS middleware

// --- Other Middleware ---
app.use(express.json()); // Body parser for JSON requests
app.use(express.urlencoded({ extended: true })); // Body parser for URL-encoded requests
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression
app.use(morgan('dev')); // HTTP request logger

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use(limiter);


// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// Use marketplaceRoutes to aggregate all marketplace-related routes
app.use('/api/marketplace', marketplaceRoutes);
// If you have other top-level routes, add them here
// app.use('/api/listings', listingRoutes); // If you want listings directly under /api
// app.use('/api/offers', offerRoutes); // If you want offers directly under /api


// Basic route for health check
app.get('/', (req, res) => {
  res.status(200).send('Mining Marketplace Backend API is running!');
});

// --- Global Error Handler ---
app.use(errorHandler); // This should be the last middleware

export default app; // Export the app for server.ts
