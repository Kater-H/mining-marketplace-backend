import Stripe from 'stripe';
import Flutterwave from 'flutterwave-node-v3';
import { pgPool } from '../config/database.ts'; // <--- ADD .ts here
import { config } from '../config/config.ts'; // <--- ADD .ts here

// Initialize payment providers
const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2022-11-15',
});

const flutterwave = new Flutterwave(
  config.flutterwavePublicKey,
  config.flutterwaveSecretKey
);

// Payment service class
export class PaymentService {
  // Create a Stripe payment intent
  async createStripePayment(
    amount: number,
    currency: string,
    buyerId: number,
    listingId: number
  ): Promise<{ clientSecret: string; transactionId: number }> {
    console.log('🔍 PaymentService.createStripePayment called with:', {
      amount, currency, buyerId, listingId
    });

    const client = await pgPool.connect();

    try {
      // Begin transaction
      console.log('🔍 Starting database transaction...');
      await client.query('BEGIN');

      // Create payment intent with Stripe
      console.log('🔍 Creating Stripe payment intent...');
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          buyer_id: buyerId.toString(),
          listing_id: listingId.toString(),
        },
      });
      console.log('✅ Stripe payment intent created:', paymentIntent.id);

      // Create transaction record
      console.log('🔍 Inserting transaction record into database...');
      const insertTransactionQuery = `
        INSERT INTO transactions (
          buyer_id, listing_id, amount, currency,
          payment_method, payment_provider, payment_id, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id;
      `;

      console.log('🔍 Insert query parameters:', [
        buyerId, listingId, amount, currency, 'card', 'stripe', paymentIntent.id, 'pending'
      ]);

      const transactionResult = await client.query(insertTransactionQuery, [
        buyerId,
        listingId,
        amount,
        currency,
        'card',
        'stripe',
        paymentIntent.id,
        'pending'
      ]);

      console.log('🔍 Transaction insert result:', transactionResult);
      console.log('🔍 Transaction result rows:', transactionResult.rows);

      if (!transactionResult.rows || transactionResult.rows.length === 0) {
        throw new Error('Failed to insert transaction record - no rows returned');
      }

      const transactionId = transactionResult.rows[0].id;
      console.log('✅ Transaction ID extracted:', transactionId);

      // Commit transaction
      console.log('🔍 Committing database transaction...');
      await client.query('COMMIT');

      console.log('✅ Payment service completed successfully');
      return {
        clientSecret: paymentIntent.client_secret as string,
        transactionId
      };
    } catch (error) {
      // Rollback transaction on error
      console.error('❌ Error in payment service, rolling back transaction:', error);
      await client.query('ROLLBACK');
      console.error('Error creating Stripe payment:', error);
      throw error;
    } finally {
      // Release client
      console.log('🔍 Releasing database client...');
      client.release();
    }
  }

  // Create a Flutterwave payment
  async createFlutterwavePayment(
    amount: number,
    currency: string,
    buyerId: number,
    listingId: number,
    customer: { email: string; name: string; phone_number?: string },
    redirectUrl: string
  ): Promise<{ paymentLink: string; transactionId: number }> {
    const client = await pgPool.connect();

    try {
      // Begin transaction
      await client.query('BEGIN');

      // Generate unique transaction reference
      const txRef = `tx_${Date.now()}_${buyerId}_${listingId}`;

      // Initialize payment with Flutterwave
      const payload = {
        tx_ref: txRef,
        amount: amount,
        currency: currency.toUpperCase(),
        redirect_url: redirectUrl,
        customer: customer,
        customizations: {
          title: 'Mining Marketplace Payment',
          description: `Payment for listing ${listingId}`,
        },
        meta: {
          buyer_id: buyerId,
          listing_id: listingId,
        },
      };

      const response = await flutterwave.Payments.initiate(payload);

      if (response.status !== 'success') {
        throw new Error('Failed to initialize Flutterwave payment');
      }

      // Create transaction record
      const insertTransactionQuery = `
        INSERT INTO transactions (
          buyer_id, listing_id, amount, currency,
          payment_method, payment_provider, payment_id, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id;