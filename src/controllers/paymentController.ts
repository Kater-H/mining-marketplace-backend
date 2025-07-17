// src/controllers/paymentController.ts
import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { config } from '../config/config.js';
import { ApplicationError } from '../utils/applicationError.js';
import { pgPool as pool } from '../config/database.js';

const stripe = new Stripe(config.stripeSecretKey as string);

// Interface for Transaction (matches database schema)
interface Transaction {
  id?: number;
  listing_id: number;
  buyer_id: number;
  seller_id: number;
  offer_id?: number | null;
  final_price: number;
  final_quantity: number;
  currency: string;
  transaction_date?: string;
  status?: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_gateway_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Create a Stripe Checkout Session
export const createCheckoutSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listing_id, offer_id, seller_id, mineralType, final_price, final_quantity, currency } = req.body;
    const buyer_id = req.user!.id; // Get buyer ID from authenticated user

    // Define minimum amounts with explicit type
    const minimumAmounts: { [key: string]: number } = { 'USD': 50, 'GBP': 30, 'EUR': 30 };
    // Access minimum amount safely, defaulting to 50 cents if currency is not found
    const minimumAmount = minimumAmounts[currency.toUpperCase()] || 50; 
    const amountInCents = Math.round(final_price * 100); // Convert to cents

    if (amountInCents < minimumAmount) {
      throw new ApplicationError(`Payment amount must be at least ${currency} ${(minimumAmount / 100).toFixed(2)} due to payment gateway minimums.`, 400);
    }

    // Create a pending transaction record in your database
    const transactionResult = await pool.query(
      `INSERT INTO transactions (listing_id, buyer_id, seller_id, offer_id, final_price, final_quantity, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING id`,
      [listing_id, buyer_id, seller_id, offer_id, final_price, final_quantity, currency]
    );
    const transactionId = transactionResult.rows[0].id;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `${mineralType} (Listing ID: ${listing_id})`,
              description: `Quantity: ${final_quantity}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${config.frontendUrl}/payment/success?transaction_id=${transactionId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/payment/cancel?transaction_id=${transactionId}`,
      client_reference_id: transactionId.toString(), // Link to your internal transaction ID
      metadata: {
        transactionId: transactionId.toString(),
        listingId: listing_id.toString(),
        buyerId: buyer_id.toString(),
        sellerId: seller_id.toString(),
        offerId: offer_id ? offer_id.toString() : '',
      },
    });

    res.status(200).json({ checkout_url: session.url });
  } catch (error) {
    next(error);
  }
};

// Handle Stripe Webhooks
export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent((req as any).rawBody, sig, config.stripeWebhookSecret as string);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      const transactionId = session.metadata?.transactionId;
      const paymentGatewayId = session.id;
      const paymentStatus = session.payment_status;

      if (transactionId && paymentStatus === 'paid') {
        try {
          await pool.query(
            `UPDATE transactions SET status = 'completed', payment_gateway_id = $1, transaction_date = CURRENT_TIMESTAMP WHERE id = $2`,
            [paymentGatewayId, parseInt(transactionId)]
          );
          console.log(`Transaction ${transactionId} marked as completed.`);
          // You might want to update listing status, notify seller, etc. here
        } catch (dbError) {
          console.error(`Database update error for transaction ${transactionId}:`, dbError);
          return res.status(500).send('Database update failed');
        }
      } else {
        console.warn(`Checkout session completed but not paid or missing transaction ID: ${session.id}`);
      }
      break;
    case 'checkout.session.expired':
      const expiredSession = event.data.object as Stripe.Checkout.Session;
      const expiredTransactionId = expiredSession.metadata?.transactionId;
      if (expiredTransactionId) {
        try {
          await pool.query(
            `UPDATE transactions SET status = 'failed', transaction_date = CURRENT_TIMESTAMP WHERE id = $1`,
            [parseInt(expiredTransactionId)]
          );
          console.log(`Transaction ${expiredTransactionId} marked as failed (expired).`);
        } catch (dbError) {
          console.error(`Database update error for expired transaction ${expiredTransactionId}:`, dbError);
          return res.status(500).send('Database update failed');
        }
      }
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({ received: true });
};

// Get transaction details by ID
export const getTransactionDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transactionId = parseInt(req.params.id);
    if (isNaN(transactionId)) {
      throw new ApplicationError('Invalid transaction ID.', 400);
    }

    const result = await pool.query('SELECT * FROM transactions WHERE id = $1', [transactionId]);
    if (result.rows.length === 0) {
      throw new ApplicationError('Transaction not found.', 404);
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};
