// src/routes/paymentRoutes.ts
import { Router } from 'express';
import {
  createCheckoutSession,
  handleWebhook,
  getTransactionDetails,
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authorizeMiddleware.js'; 

const router = Router();

// Route to create a Stripe Checkout Session (requires authentication)
router.post(
  '/',
  authenticate,
  authorizeRoles(['buyer', 'admin']),
  createCheckoutSession
);

// Route for Stripe webhooks (no authentication needed as Stripe sends the webhook)
router.post('/webhook', handleWebhook);

// Route to get transaction details by ID
// This route should NOT require authentication as it's hit directly after Stripe redirect
// and the user might not have an active session.
router.get(
  '/:id',
  // REMOVED: authenticate,
  // REMOVED: authorizeRoles(['buyer', 'miner', 'admin']),
  getTransactionDetails // Now publicly accessible (read-only) for transaction details by ID
);

export default router;
