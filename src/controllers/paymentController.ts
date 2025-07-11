import { Request, Response } from 'express';
import { PaymentService } from '../services/paymentService.js';
import { Transaction } from '../models/interfaces/marketplace.js'; // Ensure Transaction is imported
import { config } from '../config/config.js';
import Stripe from 'stripe';
import Joi from 'joi';

// Initialize Stripe with your secret key
const stripe = new Stripe(config.stripeSecretKey);

const paymentService = new PaymentService();

// Helper function for Joi validation
const validateRequest = (schema: Joi.ObjectSchema, data: any, res: Response): boolean => {
  const { error } = schema.validate(data, { abortEarly: false, allowUnknown: false });
  if (error) {
    console.error('Joi Validation Error Details:', error.details);
    res.status(400).json({
      message: 'Validation failed',
      errors: error.details.map(detail => detail.message)
    });
    return false;
  }
  return true;
};

// Joi schema for creating a payment/transaction
export const createPaymentSchema = Joi.object({
  listing_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Listing ID must be a number.',
      'number.integer': 'Listing ID must be an integer.',
      'number.positive': 'Listing ID must be a positive number.',
      'any.required': 'Listing ID is required.'
    }),
  seller_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Seller ID must be a number.',
      'number.integer': 'Seller ID must be an integer.',
      'number.positive': 'Seller ID must be a positive number.',
      'any.required': 'Seller ID is required.'
    }),
  offer_id: Joi.number().integer().positive().allow(null).optional()
    .messages({
      'number.base': 'Offer ID must be a number.',
      'number.integer': 'Offer ID must be an integer.',
      'number.positive': 'Offer ID must be a positive number.'
    }),
  final_price: Joi.number().positive().precision(8).required()
    .messages({
      'number.base': 'Final price must be a number.',
      'number.positive': 'Final price must be a positive number.',
      'number.precision': 'Final price can have at most 8 decimal places.',
      'any.required': 'Final price is required.'
    }),
  final_quantity: Joi.number().positive().precision(8).required()
    .messages({
      'number.base': 'Final quantity must be a number.',
      'number.positive': 'Final quantity must be a positive number.',
      'number.precision': 'Final quantity can have at most 8 decimal places.',
      'any.required': 'Final quantity is required.'
    }),
  currency: Joi.string().length(3).uppercase().required()
    .messages({
      'string.empty': 'Currency cannot be empty.',
      'string.length': 'Currency must be 3 characters long (e.g., USD).',
      'string.uppercase': 'Currency must be in uppercase.',
      'any.required': 'Currency is required.'
    }),
  mineralType: Joi.string().min(2).max(100).required() // Added for Stripe product name
    .messages({
      'string.empty': 'Mineral type cannot be empty.',
      'string.min': 'Mineral type must be at least 2 characters long.',
      'string.max': 'Mineral type cannot exceed 100 characters.',
      'any.required': 'Mineral type is required.'
    })
});

// Joi schema for updating transaction status
export const updateTransactionStatusSchema = Joi.object({
  status: Joi.string()
    .valid('completed', 'pending', 'failed', 'refunded')
    .required()
    .messages({
      'any.only': 'Status must be one of "completed", "pending", "failed", "refunded".',
      'any.required': 'Status is required.'
    }),
  paymentGatewayId: Joi.string().max(255).optional().allow(null) // Allow null for initial status
    .messages({
      'string.max': 'Payment Gateway ID cannot exceed 255 characters.'
    })
});


/**
 * Initiates a payment process and creates a pending transaction, or reuses/updates an existing one.
 * @param req Request object (expects listing_id, offer_id, final_price, final_quantity, currency, seller_id in body)
 * @param res Response object
 */
export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    // Joi validation for request body
    if (!validateRequest(createPaymentSchema, req.body, res)) {
      return; // Validation failed, response already sent
    }

    const { listing_id, offer_id, final_price, final_quantity, currency, seller_id, mineralType } = req.body;
    const buyer_id = (req as any).user.id; // Get buyer ID from authenticated user

    let transaction_id: number;
    let transactionStatusToSet: Transaction['status'] = 'pending'; // Default status for new/reused transactions

    // --- NEW LOGIC: Check for existing transaction for this offer_id ---
    if (offer_id) { // Only check if an offer_id is provided
      const existingTransaction = await paymentService.getTransactionByOfferId(offer_id);
      if (existingTransaction) {
        console.log(`Found existing transaction for offer_id ${offer_id}. Status: ${existingTransaction.status}.`);

        // If completed, do not proceed with payment for this offer
        if (existingTransaction.status === 'completed') {
          res.status(200).json({
            message: 'This offer has already been paid for and completed.',
            transaction_id: existingTransaction.id
          });
          return; // IMPORTANT: Exit here if already completed
        }

        // For pending, failed, or refunded transactions, reuse the existing transaction ID
        // and create a new Stripe session for it.
        transaction_id = existingTransaction.id!; // We know ID exists for an existing transaction

        // If previous status was failed/refunded, reset to pending for new attempt
        if (existingTransaction.status === 'failed' || existingTransaction.status === 'refunded') {
            transactionStatusToSet = 'pending';
            console.log(`Previous transaction for offer ${offer_id} was ${existingTransaction.status}. Re-attempting payment with transaction ID ${transaction_id}.`);
        } else { // existingTransaction.status === 'pending'
            transactionStatusToSet = 'pending'; // Explicitly keep as pending
            console.log(`Reusing existing pending transaction ID ${transaction_id} for offer ${offer_id}.`);
        }

      } else {
        // No existing transaction for this offer_id, so create a new one
        const transactionData: Transaction = {
          listing_id,
          buyer_id,
          seller_id,
          offer_id: offer_id, // offer_id is guaranteed non-null here
          final_price,
          final_quantity,
          currency,
          status: 'pending', // Initial status for a brand new transaction
        };
        const result = await paymentService.createTransaction(transactionData);
        transaction_id = result.transaction_id;
        console.log(`Created new transaction with ID ${transaction_id} for offer ${offer_id}.`);
      }
    } else {
        // Handle direct purchases (no offer_id provided) - always create a new transaction
        const transactionData: Transaction = {
            listing_id,
            buyer_id,
            seller_id,
            offer_id: null, // Explicitly null for direct purchases
            final_price,
            final_quantity,
            currency,
            status: 'pending', // Initial status for a direct purchase transaction
        };
        const result = await paymentService.createTransaction(transactionData);
        transaction_id = result.transaction_id;
        console.log(`Created new transaction with ID ${transaction_id} for direct purchase of listing ${listing_id}.`);
    }

    // Now, create the Stripe Checkout Session using the determined transaction_id
    // This part is common whether we reused an existing transaction or created a new one
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency,
          product_data: {
            name: `Mineral Listing: ${mineralType} (ID: ${listing_id})`,
          },
          unit_amount: Math.round(final_price * final_quantity * 100), // Total amount in cents
        },
        quantity: 1, // Always send quantity as 1 when unit_amount is the total
      }],
      mode: 'payment',
      success_url: `${config.frontendUrl}/success?transaction_id=${transaction_id}`,
      cancel_url: `${config.frontendUrl}/cancel?transaction_id=${transaction_id}`,
      metadata: {
        transaction_id: transaction_id.toString(), // Link your internal transaction ID to Stripe
        listing_id: listing_id.toString(),
        buyer_id: buyer_id.toString(),
        seller_id: seller_id.toString(),
        offer_id: offer_id ? offer_id.toString() : ''
      },
    });

    // Update the transaction with the new Stripe session ID and the determined status
    await paymentService.updateTransactionStatus(transaction_id, transactionStatusToSet, session.id);

    res.status(200).json({ message: 'Payment initiated', checkout_url: session.url, transaction_id });

  } catch (error) {
    console.error('Error creating payment/transaction:', error);
    // Extract a more specific error message if available, otherwise a generic one
    const errorMessage = (error as any).detail || (error as Error).message || 'An unknown error occurred.';
    res.status(500).json({ message: 'Failed to create payment/transaction', error: errorMessage });
  }
};

/**
 * Handles incoming webhook events from payment gateways.
 * This endpoint should be publicly accessible to the payment gateway.
 * It does NOT need authentication middleware.
 * @param req Request object (raw body and signature header)
 * @param res Response object
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const provider = req.params.provider as 'stripe' | 'flutterwave'; // 'stripe' or 'flutterwave'
  const signatureHeader = req.headers['stripe-signature'] || req.headers['x-flw-signature'];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader || '';

  const rawBody = (req as any).rawBody;

  if (!signature || !rawBody) {
    res.status(400).json({ message: 'Missing webhook signature or raw body' });
    return;
  }

  try {
    await paymentService.handleWebhookEvent(rawBody, signature, provider);
    res.status(200).json({ received: true }); // Acknowledge receipt of the webhook
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(400).json({ message: 'Webhook processing failed', error: (error as Error).message });
  }
};

/**
 * Retrieves a transaction by ID.
 * @param req Request object
 * @param res Response object
 */
export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactionId = parseInt(req.params.id);
    if (isNaN(transactionId) || transactionId <= 0) { // Basic validation for ID param
      res.status(400).json({ message: 'Invalid transaction ID' });
      return;
    }

    const transaction = await paymentService.getTransactionById(transactionId);

    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    const userId = (req as any).user.id;
    const userRoles = (req as any).user.roles;
    const isAdmin = userRoles.includes('admin');
    const isRelatedUser = transaction.buyer_id === userId || transaction.seller_id === userId;

    if (!isAdmin && !isRelatedUser) {
      res.status(403).json({ message: 'Forbidden: You can only view your own transactions or as an admin' });
      return;
    }

    res.status(200).json(transaction);
  } catch (error) {
    console.error('Error getting transaction by ID:', error);
    res.status(500).json({ message: 'Failed to retrieve transaction', error: (error as Error).message });
  }
};

/**
 * Updates a transaction's status. (Typically used internally or by admin)
 * @param req Request object (expects status and optional paymentGatewayId in body)
 * @param res Response object
 */
export const updateTransactionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactionId = parseInt(req.params.id);
    if (isNaN(transactionId) || transactionId <= 0) { // Basic validation for ID param
      res.status(400).json({ message: 'Invalid transaction ID' });
      return;
    }

    // Joi validation for request body
    if (!validateRequest(updateTransactionStatusSchema, req.body, res)) {
      return; // Validation failed, response already sent
    }

    const { status, paymentGatewayId } = req.body;
    const userRoles = (req as any).user.roles;

    if (!userRoles.includes('admin')) {
      res.status(403).json({ message: 'Forbidden: Only admins can update transaction status directly' });
      return;
    }

    const updatedTransaction = await paymentService.updateTransactionStatus(transactionId, status, paymentGatewayId);
    res.status(200).json({ message: 'Transaction status updated successfully', transaction: updatedTransaction });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ message: 'Failed to update transaction status', error: (error as Error).message });
  }
};
