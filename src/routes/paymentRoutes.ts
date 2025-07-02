import { Router } from 'express';
import {
  createPayment,
  handleWebhook,
  getTransactionById,
  updateTransactionStatus
} from '../controllers/paymentController.js'; // Ensure .js is here
import { authenticate, authorize } from '../middleware/authMiddleware.js'; // Ensure .js is here

const router = Router();

// Public webhook endpoint (does NOT need authentication)
// The payment gateway will send events here.
// e.g., POST /api/payments/webhook/stripe or /api/payments/webhook/flutterwave
router.post('/webhook/:provider', handleWebhook);

// Authenticated routes for payment initiation and transaction management
router.use(authenticate); // Apply authentication to all routes below this point

// Initiate a payment (e.g., create a Stripe Checkout Session, Flutterwave payment link)
// Buyer role initiates payment for a listing/offer
router.post('/', authorize('buyer'), createPayment);

// Get a specific transaction by ID
// Accessible by buyer/seller involved in transaction or admin
router.get('/:id', getTransactionById);

// Update transaction status (typically for internal use or admin)
// This is often triggered by webhooks, but an admin might manually adjust.
router.put('/:id/status', authorize('admin'), updateTransactionStatus);


export const paymentRoutes = router;