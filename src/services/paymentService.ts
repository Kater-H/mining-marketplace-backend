import { Pool } from 'pg';
import { getPool } from '../config/database.js';
import { Transaction, WebhookEvent } from '../models/interfaces/marketplace.js'; // Import new interfaces
import { config } from '../config/config.js'; // Import config for secret keys

// Assume you have Stripe and Flutterwave SDKs installed and initialized
// import Stripe from 'stripe';
// const stripe = new Stripe(config.stripeSecretKey, { apiVersion: '2022-11-15' }); // Use your Stripe API version
// import Flutterwave from 'flutterwave-node-v3';
// const flw = new Flutterwave(config.flutterwavePublicKey, config.flutterwaveSecretKey);

export class PaymentService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Creates a new transaction record in the database.
   * This is typically called after an offer is accepted and payment process begins.
   * @param transactionData The data for the new transaction.
   * @returns The ID of the created transaction.
   */
  async createTransaction(transactionData: Transaction): Promise<{ transaction_id: number }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO transactions (
          listing_id, buyer_id, seller_id, offer_id,
          final_price, final_quantity, currency,
          payment_gateway_id, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;
      `;

      const result = await client.query(insertQuery, [
        transactionData.listing_id,
        transactionData.buyer_id,
        transactionData.seller_id,
        transactionData.offer_id || null, // Allow null
        transactionData.final_price,
        transactionData.final_quantity,
        transactionData.currency,
        transactionData.payment_gateway_id || null, // Allow null
        transactionData.status || 'pending' // Default to pending
      ]);

      const transactionId = result.rows[0].id;

      // Update offer status to 'accepted' or 'completed' if an offer_id is present
      if (transactionData.offer_id) {
        await client.query(
          `UPDATE mineral_offers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          ['accepted', transactionData.offer_id]
        );
      }

      // Potentially update listing status to 'pending' or 'sold'
      await client.query(
        `UPDATE mineral_listings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        ['pending', transactionData.listing_id] // Or 'sold' if payment is guaranteed
      );


      await client.query('COMMIT');
      return { transaction_id: transactionId };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating transaction:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves a transaction by its ID.
   * @param transactionId The ID of the transaction.
   * @returns The transaction data or null if not found.
   */
  async getTransactionById(transactionId: number): Promise<Transaction | null> {
    try {
      const query = `SELECT * FROM transactions WHERE id = $1`;
      const result = await this.pool.query(query, [transactionId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting transaction by ID:', error);
      throw error;
    }
  }

  /**
   * Updates the status of a transaction.
   * @param transactionId The ID of the transaction to update.
   * @param newStatus The new status for the transaction.
   * @param paymentGatewayId Optional: The ID from the payment gateway (e.g., Stripe Charge ID).
   * @returns The updated transaction.
   */
  async updateTransactionStatus(
    transactionId: number,
    newStatus: 'completed' | 'pending' | 'failed' | 'refunded',
    paymentGatewayId?: string
  ): Promise<Transaction> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      let updateQuery = `
        UPDATE transactions
        SET status = $1, updated_at = CURRENT_TIMESTAMP
      `;
      const queryParams: any[] = [newStatus];
      let paramIndex = 2;

      if (paymentGatewayId) {
        updateQuery += `, payment_gateway_id = $${paramIndex++}`;
        queryParams.push(paymentGatewayId);
      }

      updateQuery += ` WHERE id = $${paramIndex++} RETURNING *;`;
      queryParams.push(transactionId);

      const result = await client.query(updateQuery, queryParams);

      if (result.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      const updatedTransaction = result.rows[0];

      // Also update related listing and offer status based on transaction status
      // This logic can be complex and might need more refinement based on your exact business rules
      if (newStatus === 'completed') {
        // Update listing status to 'sold'
        await client.query(
          `UPDATE mineral_listings SET status = 'sold', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [updatedTransaction.listing_id]
        );
        // Update offer status to 'completed' if applicable
        if (updatedTransaction.offer_id) {
          await client.query(
            `UPDATE mineral_offers SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [updatedTransaction.offer_id]
          );
        }
      } else if (newStatus === 'failed' || newStatus === 'refunded') {
        // Revert listing status or handle as needed
        await client.query(
          `UPDATE mineral_listings SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [updatedTransaction.listing_id]
        );
        // Revert offer status or handle as needed
        if (updatedTransaction.offer_id) {
          await client.query(
            `UPDATE mineral_offers SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [updatedTransaction.offer_id]
          );
        }
      }

      await client.query('COMMIT');
      return updatedTransaction;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating transaction status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Stores a raw webhook event payload in the database.
   * @param eventData The webhook event data.
   * @returns The ID of the stored webhook event.
   */
  async storeWebhookEvent(eventData: WebhookEvent): Promise<{ webhook_event_id: number }> {
    try {
      const insertQuery = `
        INSERT INTO webhook_events (event_id, event_type, payload, processed)
        VALUES ($1, $2, $3, $4)
        RETURNING id;
      `;
      const result = await this.pool.query(insertQuery, [
        eventData.event_id,
        eventData.event_type,
        eventData.payload, // JSONB column accepts JS object directly
        eventData.processed || false
      ]);
      return { webhook_event_id: result.rows[0].id };
    } catch (error) {
      console.error('Error storing webhook event:', error);
      throw error;
    }
  }

  /**
   * Handles incoming webhook events from payment gateways (e.g., Stripe, Flutterwave).
   * This function should verify the webhook signature and then process the event.
   * @param rawBody The raw request body of the webhook.
   * @param signature The signature header from the webhook (e.g., Stripe-Signature).
   * @param provider The payment provider ('stripe' or 'flutterwave').
   */
  async handleWebhookEvent(rawBody: string, signature: string, provider: 'stripe' | 'flutterwave'): Promise<void> {
    // IMPORTANT: Implement webhook signature verification first!
    // This protects against forged webhook events.
    try {
      let event;

      if (provider === 'stripe') {
        // Example Stripe webhook verification (requires stripe-signature header)
        // try {
        //   event = stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
        // } catch (err) {
        //   console.error(`⚠️ Webhook Error: Invalid Stripe signature.`, err.message);
        //   throw new Error('Invalid webhook signature');
        // }
        console.log(`Stripe webhook received: ${JSON.stringify(JSON.parse(rawBody).type)}`);
        event = JSON.parse(rawBody); // For testing without full verification

      } else if (provider === 'flutterwave') {
        // Example Flutterwave webhook verification (requires x-flw-signature header)
        // const hash = crypto.createHmac('sha512', config.flutterwaveSecretKey).update(rawBody).digest('hex');
        // if (hash !== signature) {
        //   console.error(`⚠️ Webhook Error: Invalid Flutterwave signature.`);
        //   throw new Error('Invalid webhook signature');
        // }
        console.log(`Flutterwave webhook received: ${JSON.stringify(JSON.parse(rawBody).event)}`);
        event = JSON.parse(rawBody); // For testing without full verification
      } else {
        throw new Error('Unsupported webhook provider');
      }

      // Store the raw webhook event in your database for auditing
      await this.storeWebhookEvent({
        event_id: event.id || event.data?.id || 'unknown_id', // Adjust based on actual payload structure
        event_type: event.type || event.event, // Adjust based on actual payload structure
        payload: event,
        processed: false
      });

      // Process the event based on its type
      switch (event.type || event.event) { // Use event.type for Stripe, event.event for Flutterwave
        case 'checkout.session.completed': // Stripe example
        case 'charge.succeeded': // Stripe example
        case 'payment.success': // Flutterwave example
          console.log(`Processing successful payment event: ${event.id || event.data?.id}`);
          // Extract transaction details from the event payload
          const transactionIdFromPayment = event.data?.metadata?.transaction_id || event.data?.tx_ref; // Adjust based on how you link
          const paymentGatewayId = event.data?.id || event.id; // Stripe charge ID or Flutterwave transaction ID

          if (transactionIdFromPayment) {
            await this.updateTransactionStatus(
              parseInt(transactionIdFromPayment), // Ensure it's a number
              'completed',
              paymentGatewayId
            );
            console.log(`Transaction ${transactionIdFromPayment} marked as completed.`);
          } else {
            console.warn('Could not find transaction ID in webhook payload for completion.');
          }
          break;

        case 'charge.failed': // Stripe example
        case 'payment.failed': // Flutterwave example
          console.log(`Processing failed payment event: ${event.id || event.data?.id}`);
          const failedTransactionId = event.data?.metadata?.transaction_id || event.data?.tx_ref;
          if (failedTransactionId) {
            await this.updateTransactionStatus(
              parseInt(failedTransactionId),
              'failed',
              event.data?.id || event.id
            );
            console.log(`Transaction ${failedTransactionId} marked as failed.`);
          }
          break;

        // Add more cases for other event types (e.g., refund, subscription events)
        default:
          console.log(`Unhandled webhook event type: ${event.type || event.event}`);
          break;
      }
    } catch (error) {
      console.error('Error processing webhook event:', error);
      throw error; // Re-throw to signal failure to the webhook sender
    }
  }
}
