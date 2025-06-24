import { Request, Response } from 'express';
import { paymentService } from '../services/paymentService.ts'; // <--- Add .ts here
import Stripe from 'stripe';
import { config } from '../config/config.ts'; // <--- Add .ts here

// Initialize Stripe with webhook secret
// Changed API version to match type definitions
const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2022-11-15', // Corrected API version to match @types/stripe for type compatibility
});

// Create a Stripe payment
export const createStripePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 Payment controller called - createStripePayment');
    console.log('🔍 Request body:', req.body);
    console.log('🔍 Request user:', (req as any).user);

    const { amount, currency, listing_id } = req.body;

    // Validate input
    if (!amount || !currency || !listing_id) {
      console.log('❌ Missing required fields:', { amount, currency, listing_id });
      res.status(400).json({ message: 'Please provide amount, currency, and listing_id' });
      return;
    }

    // Get user ID from auth middleware
    const user = (req as any).user;
    console.log('🔍 User object from auth middleware:', user);

    if (!user) {
      console.log('❌ No user object found');
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const buyerId = user.id;
    console.log('🔍 Buyer ID extracted:', buyerId);

    if (!buyerId) {
      console.log('❌ No buyer ID found in user object');
      res.status(401).json({ message: 'Invalid user data' });
      return;
    }

    console.log('🔍 Calling payment service with:', {
      amount: parseFloat(amount),
      currency,
      buyerId,
      listing_id: parseInt(listing_id)
    });

    // Create payment
    const result = await paymentService.createStripePayment(
      parseFloat(amount),
      currency,
      buyerId,
      parseInt(listing_id)
    );

    console.log('✅ Payment service result:', result);

    res.status(200).json({
      message: 'Payment intent created successfully',
      client_secret: result.clientSecret,
      transaction_id: result.transactionId
    });
  } catch (error) {
    console.error('Error creating Stripe payment:', error);
    res.status(500).json({ message: 'Server error during payment creation' });
  }
};

// Create a Flutterwave payment
export const createFlutterwavePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      amount,
      currency,
      listing_id,
      customer_name,
      customer_phone,
      redirect_url
    } = req.body;

    // Validate input
    if (!amount || !currency || !listing_id || !redirect_url) {
      res.status(400).json({
        message: 'Please provide amount, currency, listing_id, and redirect_url'
      });
      return;
    }

    // Get user ID and email from auth middleware
    const buyerId = (req as any).user.id;
    const buyerEmail = (req as any).user.email;

    // Create payment
    const result = await paymentService.createFlutterwavePayment(
      parseFloat(amount),
      currency,
      buyerId,
      parseInt(listing_id),
      {
        email: buyerEmail,
        name: customer_name || buyerEmail,
        phone_number: customer_phone
      },
      redirect_url
    );

    res.status(200).json({
      message: 'Flutterwave payment initialized successfully',
      payment_link: result.paymentLink,
      transaction_id: result.transactionId
    });
  } catch (error) {
    console.error('Error creating Flutterwave payment:', error);
    res.status(500).json({ message: 'Server error during payment creation' });
  }
};

// Handle Stripe webhook
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    res.status(400).json({ message: 'Missing stripe-signature header' });
    return;
  }

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.stripeWebhookSecret
    );

    // Process webhook
    await paymentService.processStripeWebhook(event);

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Error handling Stripe webhook:', error);
    res.status(400).json({ message: `Webhook Error: ${error.message}` });
  }
};

// Handle Flutterwave webhook
export const handleFlutterwaveWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Verify webhook signature (Flutterwave doesn't provide a signature verification method)
    // In a production environment, you would implement additional security checks

    // Process webhook
    await paymentService.processFlutterwaveWebhook(req.body);

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Error handling Flutterwave webhook:', error);
    res.status(400).json({ message: `Webhook Error: ${error.message}` });
  }
};

// Get transaction by ID
export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: 'Transaction ID is required' });
      return;
    }

    const transaction = await paymentService.getTransactionById(parseInt(id));

    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    // Check if user is authorized to view this transaction
    const userId = (req as any).user.id;
    if (transaction.buyer_id !== userId && (req as any).user.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized to view this transaction' });
      return;
    }

    res.status(200).json({ transaction });
  } catch (error) {
    console.error('Error getting transaction by ID:', error);
    res.status(500).json({ message: 'Server error retrieving transaction' });
  }
};

// Get user transactions
export const getUserTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get user ID from auth middleware
    const userId = (req as any).user.id;

    const transactions = await paymentService.getUserTransactions(userId);

    res.status(200).json({
      count: transactions.length,
      transactions
    });
  } catch (error) {
    console.error('Error getting user transactions:', error);
    res.status(500).json({ message: 'Server error retrieving transactions' });
  }
};