import { Request, Response } from 'express';
import { paymentService } from '../services/paymentService.js'; // ADDED .js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

// Create Stripe Payment Intent
export const createStripePaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, currency, listingId } = req.body;
    const buyerId = (req as any).user.id; // From authenticated user

    if (!amount || !currency || !listingId || !buyerId) {
      res.status(400).json({ message: 'Missing required fields: amount, currency, listingId, buyerId' });
      return;
    }

    const { clientSecret, transactionId } = await paymentService.createStripePayment(
      amount,
      currency,
      buyerId,
      listingId
    );

    res.status(200).json({ clientSecret, transactionId });
  } catch (error) {
    console.error('Error creating Stripe Payment Intent:', error);
    res.status(500).json({ message: 'Failed to create payment intent', error: (error as Error).message });
  }
};

// Handle Stripe Webhook
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  let event: Stripe.Event;

  try {
    const sig = req.headers['stripe-signature'] as string;
    // Stripe webhook secret should be in your environment variables
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Error verifying Stripe webhook signature: ${(err as Error).message}`);
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }

  try {
    await paymentService.processStripeWebhook(event);
    res.json({ received: true });
  } catch (error) {
    console.error('Error processing Stripe webhook event:', error);
    res.status(500).json({ message: 'Failed to process webhook event', error: (error as Error).message });
  }
};

// Create Flutterwave Payment
export const createFlutterwavePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, currency, listingId, customer, redirectUrl } = req.body;
    const buyerId = (req as any).user.id; // From authenticated user

    if (!amount || !currency || !listingId || !buyerId || !customer || !redirectUrl) {
      res.status(400).json({ message: 'Missing required fields for Flutterwave payment' });
      return;
    }

    const { paymentLink, transactionId } = await paymentService.createFlutterwavePayment(
      amount,
      currency,
      buyerId,
      listingId,
      customer,
      redirectUrl
    );

    res.status(200).json({ paymentLink, transactionId });
  } catch (error) {
    console.error('Error creating Flutterwave Payment:', error);
    res.status(500).json({ message: 'Failed to create Flutterwave payment', error: (error as Error).message });
  }
};

// Handle Flutterwave Webhook
export const handleFlutterwaveWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Implement Flutterwave webhook verification if necessary (e.g., checking x-flutterwave-signature)
    // For simplicity, directly process the payload for now.
    await paymentService.processFlutterwaveWebhook(req.body);
    res.status(200).json({ message: 'Flutterwave webhook received and processed' });
  } catch (error) {
    console.error('Error processing Flutterwave webhook:', error);
    res.status(500).json({ message: 'Failed to process Flutterwave webhook', error: (error as Error).message });
  }
};

// Get a single transaction by ID
export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactionId = parseInt(req.params.id);
    const transaction = await paymentService.getTransactionById(transactionId);

    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }
    res.status(200).json(transaction);
  } catch (error) {
    console.error('Error getting transaction by ID:', error);
    res.status(500).json({ message: 'Failed to retrieve transaction', error: (error as Error).message });
  }
};

// Get transactions for the current user
export const getUserTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const transactions = await paymentService.getUserTransactions(userId);
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error getting user transactions:', error);
    res.status(500).json({ message: 'Failed to retrieve user transactions', error: (error as Error).message });
  }
};
