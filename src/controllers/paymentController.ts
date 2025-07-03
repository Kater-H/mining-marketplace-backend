import { Request, Response } from 'express';
import { PaymentService } from '../services/paymentService.js'; // Ensure .js is here
import { Transaction } from '../models/interfaces/marketplace.js'; // Import Transaction interface
import { config } from '../config/config.js'; // Import config for frontendUrl
import Stripe from 'stripe'; // Import Stripe SDK
import Joi from 'joi'; // Import Joi

// Initialize Stripe with your secret key
const stripe = new Stripe(config.stripeSecretKey);

const paymentService = new PaymentService();

// Helper function for Joi validation
const validateRequest = (schema: Joi.ObjectSchema, data: any, res: Response): boolean => {
  const { error } = schema.validate(data, { abortEarly: false, allowUnknown: false });
  if (error) {
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
 * Initiates a payment process and creates a pending transaction.
 * This would typically involve calling a payment gateway SDK to get a checkout URL or client secret.
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

    // Create a pending transaction in your DB first
    const transactionData: Transaction = {
      listing_id,
      buyer_id,
      seller_id,
      offer_id: offer_id || null,
      final_price,
      final_quantity,
      currency,
      status: 'pending', // Initial status
      // payment_gateway_id will be updated by webhook
    };

    const { transaction_id } = await paymentService.createTransaction(transactionData);

    // --- INTEGRATE WITH PAYMENT GATEWAY HERE ---
    // Stripe Checkout Session:
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency,
          product_data: {
            name: `Mineral Listing: ${mineralType} (ID: ${listing_id})`, // Dynamic product name
          },
          unit_amount: Math.round(final_price * 100), // Stripe expects cents, rounded to integer
        },
        quantity: final_quantity,
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

    res.status(200).json({ message: 'Payment initiated', checkout_url: session.url, transaction_id });

  } catch (error) {
    console.error('Error creating payment/transaction:', error);
    res.status(500).json({ message: 'Failed to create payment/transaction', error: (error as Error).message });
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
