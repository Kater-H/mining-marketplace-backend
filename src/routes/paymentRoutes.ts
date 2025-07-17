// src/routes/paymentRoutes.ts
import { Router } from 'express';
import {
  createCheckoutSession,
  handleWebhook, // Corrected: Import handleWebhook
  getTransactionDetails,
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authorizeMiddleware.js'; 

const router = Router();

// Route to create a Stripe Checkout Session
router.post(
  '/',
  authenticate,
  authorizeRoles(['buyer', 'admin']),
  createCheckoutSession
);

// Route for Stripe webhooks (no authentication needed as Stripe sends the webhook)
router.post('/webhook', handleWebhook); // Use handleWebhook

// Route to get transaction details by ID
router.get(
  '/:id',
  authenticate,
  authorizeRoles(['buyer', 'miner', 'admin']),
  getTransactionDetails
);

export default router;
