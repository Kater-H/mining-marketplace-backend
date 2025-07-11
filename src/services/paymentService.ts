import { Pool } from 'pg';
import { getPool } from '../config/database.js';
import {
  Transaction,
  WebhookEvent,
  TransactionStatus // Assuming this exists or define it
} from '../models/interfaces/marketplace.js'; // Import necessary interfaces
import { config } from '../config/config.js'; // Import config for secret keys
import Stripe from 'stripe'; // Import Stripe for webhook handling

// Define TransactionStatus if not already in marketplace.js
// This should match your database enum for transaction status
// type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';


export class PaymentService {
  private pool: Pool;
  private stripe: Stripe; // Add Stripe instance to service

  constructor(paymentModel?: any) {
    this.pool = paymentModel?.pool || getPool();
    this.stripe = new Stripe(config.stripeSecretKey); // Initialize Stripe
  }

  // Create a new transaction in the database
  async createTransaction(transactionData: Transaction): Promise<{ transaction_id: number }> {
    const client = await this.pool.connect();
    try {
      const insertQuery = `
        INSERT INTO transactions (
          listing_id, buyer_id, seller_id, offer_id,
          final_price, final_quantity, currency, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id;
      `;
      const result = await client.query(insertQuery, [
        transactionData.listing_id,
        transactionData.buyer_id,
        transactionData.seller_id,
        transactionData.offer_id,
        transactionData.final_price,
        transactionData.final_quantity,
        transactionData.currency,
        transactionData.status,
      ]);
      return { transaction_id: result.rows[0].id };
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get a transaction by its ID
  async getTransactionById(transactionId: number): Promise<Transaction | null> {
    const client = await this.pool.connect();
    try {
      const query = `SELECT * FROM transactions WHERE id = $1`;
      const result = await client.query(query, [transactionId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting transaction by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ADDED: Get a transaction by its offer_id
  async getTransactionByOfferId(offerId: number): Promise<Transaction | null> {
    const client = await this.pool.connect();
    try {
      const query = `SELECT * FROM transactions WHERE offer_id = $1`;
      const result = await client.query(query, [offerId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting transaction by offer ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update a transaction's status
  async updateTransactionStatus(transactionId: number, status: TransactionStatus, paymentGatewayId?: string | null): Promise<Transaction> {
    const client = await this.pool.connect();
    try {
      const updateFields: string[] = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
      const queryParams: any[] = [status];
      let paramIndex = 2;

      if (paymentGatewayId !== undefined) {
        updateFields.push(`payment_gateway_id = $${paramIndex++}`);
        queryParams.push(paymentGatewayId);
      }

      const query = `
        UPDATE transactions
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++}
        RETURNING *;
      `;
      queryParams.push(transactionId);

      const result = await client.query(query, queryParams);
      if (result.rows.length === 0) {
        throw new Error('Transaction not found');
      }
      return result.rows[0];
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Handle webhook events (e.g., from Stripe)
  async handleWebhookEvent(rawBody: string, signature: string, provider: 'stripe' | 'flutterwave'): Promise<void> {
    try {
      let event;
      if (provider === 'stripe') {
        const endpointSecret = config.stripeWebhookSecret; // Ensure this is set in your config
        event = this.stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
      } else {
        throw new Error('Unsupported webhook provider');
      }

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          const transactionId = parseInt(session.metadata?.transaction_id || '0');
          if (transactionId) {
            await this.updateTransactionStatus(transactionId, 'completed', session.id);
            // Optionally, update offer status to 'completed' here as well
            // You might need to fetch the offer first if its ID is not in metadata
            // Or add a method to update offer status in marketplaceService
          }
          break;
        case 'payment_intent.payment_failed':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          // Find transaction by paymentIntent.id or metadata
          // Update transaction status to 'failed'
          break;
        // ... handle other event types as needed
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
    } catch (error) {
      console.error('Webhook signature verification failed or event handling error:', error);
      throw error;
    }
  }
}
