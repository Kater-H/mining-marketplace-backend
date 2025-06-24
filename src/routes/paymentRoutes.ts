import * as express from 'express';
import { authorize } from '../middleware/authMiddleware.ts'; // <--- Add .ts here
import { 
  createStripePayment,
  createFlutterwavePayment,
  getTransactionById,
  getUserTransactions,
  handleStripeWebhook,
  handleFlutterwaveWebhook
} from '../controllers/paymentController.ts'; // <--- Add .ts here

const router = express.Router();

// Create payments
router.post('/stripe/create', authorize('buyer', 'miner', 'admin'), createStripePayment);
router.post('/flutterwave/create', authorize('buyer', 'miner', 'admin'), createFlutterwavePayment);

// Get transaction by ID
router.get('/transactions/:id', authorize('buyer', 'miner', 'admin'), getTransactionById);

// Get transactions by user
router.get('/transactions', authorize('buyer', 'miner', 'admin'), getUserTransactions);

// Payment gateway webhooks (no auth required)
router.post('/webhooks/stripe', handleStripeWebhook);
router.post('/webhooks/flutterwave', handleFlutterwaveWebhook);

export { router as paymentRoutes };