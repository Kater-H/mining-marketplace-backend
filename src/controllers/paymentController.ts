import { Router } from 'express';
import {
  createStripePaymentIntent,
  handleStripeWebhook,
  createFlutterwavePayment,
  handleFlutterwaveWebhook,
  getTransactionById,
  getUserTransactions
} from '../controllers/paymentController'; // Removed .ts
import { authenticate } from '../middleware/authMiddleware'; // Removed .ts

const router = Router();

// Webhook routes (no authentication needed for webhooks as they have their own verification)
router.post('/stripe-webhook', handleStripeWebhook);
router.post('/flutterwave-webhook', handleFlutterwaveWebhook);

// Authenticated payment routes
router.use(authenticate); // Apply authentication to all routes below this point

router.post('/stripe-intent', createStripePaymentIntent);
router.post('/flutterwave-initiate', createFlutterwavePayment);
router.get('/transactions/:id', getTransactionById);
router.get('/my-transactions', getUserTransactions);

export const paymentRoutes = router;
