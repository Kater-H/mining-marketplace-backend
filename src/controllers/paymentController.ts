import { Request, Response } from 'express';
import { PaymentService } from '../services/paymentService.js'; // Ensure .js is here
import { Transaction } from '../models/interfaces/marketplace.js'; // Import Transaction interface

const paymentService = new PaymentService();

/**
 * Initiates a payment process and creates a pending transaction.
 * This would typically involve calling a payment gateway SDK to get a checkout URL or client secret.
 * @param req Request object (expects listing_id, offer_id, final_price, final_quantity, currency in body)
 * @param res Response object
 */
export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { listing_id, offer_id, final_price, final_quantity, currency, seller_id } = req.body;
    const buyer_id = (req as any).user.id; // Get buyer ID from authenticated user

    // Basic validation
    if (!listing_id || !buyer_id || !seller_id || !final_price || !final_quantity || !currency) {
      res.status(400).json({ message: 'Missing required transaction details' });
      return;
    }

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
    // Example (Stripe Checkout Session):
    // const session = await stripe.checkout.sessions.create({
    //   payment_method_types: ['card'],
    //   line_items: [{
    //     price_data: {
    //       currency: currency,
    //       product_data: {
    //         name: `Mineral Listing ${listing_id}`,
    //       },
    //       unit_amount: final_price * 100, // Stripe expects cents
    //     },
    //     quantity: final_quantity,
    //   }],
    //   mode: 'payment',
    //   success_url: `${config.frontendUrl}/success?transaction_id=${transaction_id}`,
    //   cancel_url: `${config.frontendUrl}/cancel?transaction_id=${transaction_id}`,
    //   metadata: {
    //     transaction_id: transaction_id, // Link your internal transaction ID to Stripe
    //     listing_id: listing_id,
    //     buyer_id: buyer_id,
    //   },
    // });

    // Example (Flutterwave Inline Payment):
    // const payload = {
    //   tx_ref: `TX-${Date.now()}-${transaction_id}`, // Unique transaction reference
    //   amount: final_price * final_quantity,
    //   currency: currency,
    //   redirect_url: `${config.frontendUrl}/success?transaction_id=${transaction_id}`,
    //   customer: {
    //     email: (req as any).user.email, // Assuming user email is available
    //     phonenumber: (req as any).user.phoneNumber || 'N/A',
    //     name: `${(req as any).user.firstName} ${(req as any).user.lastName}`,
    //   },
    //   customizations: {
    //     title: 'Mineral Purchase',
    //     description: `Payment for Listing ${listing_id}`,
    //   },
    //   meta: {
    //     transaction_id: transaction_id, // Link your internal transaction ID to Flutterwave
    //     listing_id: listing_id,
    //     buyer_id: buyer_id,
    //   }
    // };
    // const response = await flw.Payment.initiate(payload);
    // if (response.status === 'success') {
    //   res.status(200).json({ message: 'Payment initiated', checkout_url: response.data.link });
    // } else {
    //   throw new Error('Failed to initiate Flutterwave payment');
    // }

    // For now, return a success message assuming payment gateway integration would follow
    res.status(201).json({
      message: 'Transaction initiated and pending record created. Payment gateway integration placeholder.',
      transaction_id
    });

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
  const signature = req.headers['stripe-signature'] || req.headers['x-flw-signature'] as string; // Adjust header name based on provider
  const rawBody = (req as any).rawBody; // Ensure you have a raw body parser middleware before this!

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
    const transaction = await paymentService.getTransactionById(transactionId);

    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    // Optional: Add authorization check here (e.g., only buyer/seller/admin can view their transactions)
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
    const { status, paymentGatewayId } = req.body;

    // Basic validation for status
    const validStatuses = ['completed', 'pending', 'failed', 'refunded'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ message: 'Invalid or missing status' });
      return;
    }

    // Authorization: Only admin or internal system should update status directly
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
