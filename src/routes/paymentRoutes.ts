import { Router } from 'express';
import {
  createPayment,
  handleWebhook,
  getTransactionById, // Import the getTransactionById function
} from '../controllers/paymentController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import express from 'express'; // Import express to use express.raw()

const router = Router();

// Route for creating payments (requires authentication)
router.post('/', authenticate, authorize('buyer', 'admin'), createPayment);

// Route for getting a specific payment/transaction by ID (requires authentication)
// Only the buyer, seller, or an admin should be able to view a transaction
router.get('/:id', authenticate, authorize('buyer', 'miner', 'admin'), getTransactionById);


// Webhook route - IMPORTANT: This must come BEFORE express.json() if you need the raw body
// Use express.raw() specifically for webhook endpoints that require the raw body
// The 'type' option should match the Content-Type header of the incoming webhook
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // This middleware parses the raw body
  handleWebhook // Your controller function to handle the webhook
);


export const paymentRoutes = router;
