import { Router } from 'express';
import {
  createPayment,
  handleWebhook, // Assuming you have a handleWebhook function in your controller
} from '../controllers/paymentController.js'; // Ensure .js is here
import { authenticate, authorize } from '../middleware/authMiddleware.js'; // Ensure .js is here
import express from 'express'; // Import express to use express.raw()

const router = Router();

// Route for creating payments (requires authentication)
router.post('/', authenticate, authorize('buyer', 'admin'), createPayment);

// Webhook route - IMPORTANT: This must come BEFORE express.json() if you need the raw body
// Use express.raw() specifically for webhook endpoints that require the raw body
// The 'type' option should match the Content-Type header of the incoming webhook
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // This middleware parses the raw body
  handleWebhook // Your controller function to handle the webhook
);


export const paymentRoutes = router;
