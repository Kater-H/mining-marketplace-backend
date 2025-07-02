import { Pool } from 'pg';
import { getPool } from '../config/database.js';
import { Transaction, WebhookEvent } from '../models/interfaces/marketplace.js'; // Import new interfaces
import { config } from '../config/config.js'; // Import config for secret keys
import Stripe from 'stripe'; // Import Stripe SDK
import crypto from 'crypto'; // For Flutterwave, but generally useful for hashing

// Initialize Stripe with your secret key
// REMOVED: apiVersion to let Stripe SDK use its default latest version,
// which should resolve the TypeScript error.
const stripe = new Stripe(config.stripeSecretKey);

// If you plan to use Flutterwave, uncomment and initialize here
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
    const client = await this.pool.connect(); // Client acquired
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
      // This logic might need refinement based on when you consider an offer 'accepted' vs 'completed'
      // For now, we'll mark it accepted when a transaction is initiated
      if (transactionData.offer_id) {
        await client.query(
          `UPDATE mineral_offers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          ['accepted', transactionData.offer_id]
        );
      }

      // Potentially update listing status to 'pending' or 'sold'
      // Mark listing as 'pending' to indicate it's under transaction
      await client.query(
        `UPDATE mineral_listings SET status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [transactionData.listing_id]
      );


      await client.query('COMMIT');
      return { transaction_id: transactionId };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating transaction:', error);
      throw error;
    } finally {
      client.release(); // Client released
    }
  }

  /**
   * Retrieves a transaction by its ID.
   * @param transactionId The ID of the transaction.
   * @returns The transaction data or null if not found.
   */
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
    const client = await this.pool.connect();
    try {
      const insertQuery = `
        INSERT INTO webhook_events (event_id, event_type, payload, processed)
        VALUES ($1, $2, $3, $4)
        RETURNING id;
      `;
      const result = await client.query(insertQuery, [
        eventData.event_id,
        eventData.event_type,
        eventData.payload, // JSONB column accepts JS object directly
        eventData.processed || false
      ]);
      return { webhook_event_id: result.rows[0].id };
    } catch (error) {
      console.error('Error storing webhook event:', error);
      throw error;
    } finally {
      client.release();
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
    try {
      let event: Stripe.Event | any; // Type for Stripe event, or any for Flutterwave/placeholder

      if (provider === 'stripe') {
        // Stripe webhook verification (requires stripe-signature header)
        try {
          // IMPORTANT: Use your actual Stripe webhook secret from config
          event = stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
          console.log(`Stripe webhook verified and received: ${event.type}`);
        } catch (err: any) {
          console.error(`⚠️ Webhook Error: Invalid Stripe signature or event parsing failed.`, err.message);
          throw new Error('Invalid webhook signature or event');
        }
      } else if (provider === 'flutterwave') {
        // Flutterwave webhook verification (requires x-flw-signature header)
        // const hash = crypto.createHmac('sha512', config.flutterwaveWebhookSecret).update(rawBody).digest('hex');
        // if (hash !== signature) {
        //   console.error(`⚠️ Webhook Error: Invalid Flutterwave signature.`);
        //   throw new Error('Invalid webhook signature');
        // }
        console.log(`Flutterwave webhook received (verification skipped for now): ${JSON.parse(rawBody).event}`);
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
      switch (event.type) { // Use event.type for Stripe events
        case 'checkout.session.completed':
          console.log(`Processing Stripe checkout.session.completed event: ${event.id}`);
          const session = event.data.object as Stripe.Checkout.Session;
          const transactionIdFromMetadata = session.metadata?.transaction_id;

          if (transactionIdFromMetadata) {
            await this.updateTransactionStatus(
              parseInt(transactionIdFromMetadata),
              'completed',
              session.payment_intent as string || session.id // Use payment_intent ID if available, else session ID
            );
            console.log(`Transaction ${transactionIdFromMetadata} marked as completed via checkout session.`);
          } else {
            console.warn('Could not find transaction ID in Stripe Checkout Session metadata for completion.');
          }
          break;

        case 'charge.succeeded':
          console.log(`Processing Stripe charge.succeeded event: ${event.id}`);
          const charge = event.data.object as Stripe.Charge;
          const transactionIdFromChargeMetadata = charge.metadata?.transaction_id;

          if (transactionIdFromChargeMetadata) {
            await this.updateTransactionStatus(
              parseInt(transactionIdFromChargeMetadata),
              'completed',
              charge.id
            );
            console.log(`Transaction ${transactionIdFromChargeMetadata} marked as completed via charge.`);
          } else {
            console.warn('Could not find transaction ID in Stripe Charge metadata for completion.');
          }
          break;

        case 'charge.failed':
          console.log(`Processing Stripe charge.failed event: ${event.id}`);
          const failedCharge = event.data.object as Stripe.Charge;
          const failedTransactionId = failedCharge.metadata?.transaction_id;

          if (failedTransactionId) {
            await this.updateTransactionStatus(
              parseInt(failedTransactionId),
              'failed',
              failedCharge.id
            );
            console.log(`Transaction ${failedTransactionId} marked as failed.`);
          }
          break;

        case 'charge.refunded':
          console.log(`Processing Stripe charge.refunded event: ${event.id}`);
          const refundedCharge = event.data.object as Stripe.Charge;
          const refundedTransactionId = refundedCharge.metadata?.transaction_id;

          if (refundedTransactionId) {
            await this.updateTransactionStatus(
              parseInt(refundedTransactionId),
              'refunded',
              refundedCharge.id
            );
            console.log(`Transaction ${refundedTransactionId} marked as refunded.`);
          }
          break;

        // Add cases for Flutterwave events if you enable it
        // case 'payment.success': // Flutterwave example
        //   console.log(`Processing Flutterwave successful payment event: ${event.data.id}`);
        //   const flwTransactionId = event.data.meta?.transaction_id || event.data.tx_ref;
        //   if (flwTransactionId) {
        //     await this.updateTransactionStatus(
        //       parseInt(flwTransactionId),
        //       'completed',
        //       event.data.id // Flutterwave transaction ID
        //     );
        //     console.log(`Transaction ${flwTransactionId} marked as completed via Flutterwave.`);
        //   }
        //   break;

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
          break;
      }
    } catch (error) {
      console.error('Error processing webhook event:', error);
      throw error; // Re-throw to signal failure to the webhook sender
    }
  }
}
