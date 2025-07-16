// src/routes/paymentRoutes.ts
import { Router } from 'express';
import {
  createCheckoutSession,
  handleStripeWebhook,
  getTransactionDetails,
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/authMiddleware.js'; // Corrected: Import authenticate
import { authorizeRoles } from '../middleware/authorizeMiddleware.js'; 

const router = Router();

// Route to create a Stripe Checkout Session
router.post(
  '/',
  authenticate, // Use authenticate middleware
  authorizeRoles(['buyer', 'admin']),
  createCheckoutSession
);

// Route for Stripe webhooks (no authentication needed as Stripe sends the webhook)
router.post('/webhook', handleStripeWebhook);

// Route to get transaction details by ID
router.get(
  '/:id',
  authenticate, // Use authenticate middleware
  authorizeRoles(['buyer', 'miner', 'admin']),
  getTransactionDetails
);

export default router;
