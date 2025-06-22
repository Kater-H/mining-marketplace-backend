import { Request, Response } from 'express';
import { paymentService } from '../../services/paymentService';
import Stripe from 'stripe';
import { config } from '../../config/config';

// Mock the paymentService module
jest.mock('../../services/paymentService', () => ({
  paymentService: {
    createStripePayment: jest.fn(),
    createFlutterwavePayment: jest.fn(),
    processStripeWebhook: jest.fn(),
    processFlutterwaveWebhook: jest.fn(),
    getTransactionById: jest.fn(),
    getUserTransactions: jest.fn(),
  },
}));

// Mock the stripe module directly to return a mocked instance
jest.mock('stripe', () => {
  const mockStripeInstance = {
    webhooks: {
      constructEvent: jest.fn(),
    },
  };
  // Mock the constructor to return the mockStripeInstance
  return jest.fn(() => mockStripeInstance);
});

// Mock the config module
jest.mock('../../config/config', () => ({
  config: {
    stripeSecretKey: 'mock_stripe_secret_key',
    stripeWebhookSecret: 'mock_stripe_webhook_secret',
  },
}));

// Import the functions to be tested after mocks are set up
import { createStripePayment, createFlutterwavePayment, handleStripeWebhook, handleFlutterwaveWebhook, getTransactionById, getUserTransactions } from '../../controllers/paymentController';

describe('PaymentController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  // This beforeEach applies to all tests within PaymentController describe block
  beforeEach(() => {
    jest.clearAllMocks();
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockReq = {};
    mockRes = {
      status: mockStatus,
      json: mockJson
    };
  });

  describe('createStripePayment', () => {
    it('should create a Stripe payment and return 200 status', async () => {
      const mockPaymentData = {
        amount: 100,
        currency: 'usd',
        listing_id: 123,
      };
      const mockUserId = 'user123';
      (mockReq as any).user = { id: mockUserId };
      mockReq.body = mockPaymentData;

      (paymentService.createStripePayment as jest.Mock).mockResolvedValue({
        clientSecret: 'mock_client_secret',
        transactionId: 'mock_transaction_id',
      });

      await createStripePayment(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Payment intent created successfully',
        client_secret: 'mock_client_secret',
        transaction_id: 'mock_transaction_id',
      });
      expect(paymentService.createStripePayment).toHaveBeenCalledWith(
        mockPaymentData.amount,
        mockPaymentData.currency,
        mockUserId,
        mockPaymentData.listing_id
      );
    });

    it('should return 400 if required fields are missing', async () => {
      mockReq.body = {
        amount: 100,
        currency: 'usd',
        // Missing listing_id
      };

      await createStripePayment(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Please provide amount, currency, and listing_id' });
    });

    it('should return 500 if an error occurs', async () => {
      mockReq.body = {
        amount: 100,
        currency: 'usd',
        listing_id: 123,
      };
      (mockReq as any).user = { id: 'user123' };

      (paymentService.createStripePayment as jest.Mock).mockRejectedValue(new Error('Stripe error'));

      await createStripePayment(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Server error during payment creation' });
    });
  });

  describe('createFlutterwavePayment', () => {
    it('should create a Flutterwave payment and return 200 status', async () => {
      const mockPaymentData = {
        amount: 200,
        currency: 'ngn',
        listing_id: 456,
        customer_name: 'John Doe',
        customer_phone: '08012345678',
        redirect_url: 'https://example.com/redirect',
      };
      const mockUserId = 'user456';
      const mockUserEmail = 'john.doe@example.com';
      (mockReq as any).user = { id: mockUserId, email: mockUserEmail };
      mockReq.body = mockPaymentData;

      (paymentService.createFlutterwavePayment as jest.Mock).mockResolvedValue({
        paymentLink: 'mock_payment_link',
        transactionId: 'mock_flutterwave_transaction_id',
      });

      await createFlutterwavePayment(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Flutterwave payment initialized successfully',
        payment_link: 'mock_payment_link',
        transaction_id: 'mock_flutterwave_transaction_id',
      });
      expect(paymentService.createFlutterwavePayment).toHaveBeenCalledWith(
        mockPaymentData.amount,
        mockPaymentData.currency,
        mockUserId,
        mockPaymentData.listing_id,
        {
          email: mockUserEmail,
          name: mockPaymentData.customer_name,
          phone_number: mockPaymentData.customer_phone,
        },
        mockPaymentData.redirect_url
      );
    });

    it('should return 400 if required fields are missing', async () => {
      mockReq.body = {
        amount: 200,
        currency: 'ngn',
        // Missing listing_id and redirect_url
      };

      await createFlutterwavePayment(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Please provide amount, currency, listing_id, and redirect_url',
      });
    });

    it('should return 500 if an error occurs', async () => {
      mockReq.body = {
        amount: 200,
        currency: 'ngn',
        listing_id: 456,
        redirect_url: 'https://example.com/redirect',
      };
      (mockReq as any).user = { id: 'user456', email: 'john.doe@example.com' };

      (paymentService.createFlutterwavePayment as jest.Mock).mockRejectedValue(
        new Error('Flutterwave error')
      );

      await createFlutterwavePayment(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Server error during payment creation' });
    });
  });

  describe('handleStripeWebhook', () => {
    let mockStripeConstructEvent: jest.Mock;

    beforeEach(() => {
      // Get the mocked Stripe instance and its method
      const mockedStripe = new Stripe('dummy_key'); // Instantiate the mocked Stripe
      mockStripeConstructEvent = mockedStripe.webhooks.constructEvent as jest.Mock;
      mockStripeConstructEvent.mockClear();
    });

    it('should handle Stripe webhook successfully and return 200 status', async () => {
      mockReq.headers = { 'stripe-signature': 'mock_signature' };
      mockReq.body = { id: 'evt_test', type: 'payment_intent.succeeded' };

      mockStripeConstructEvent.mockReturnValue(mockReq.body);
      (paymentService.processStripeWebhook as jest.Mock).mockResolvedValue(true);

      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ received: true });
      expect(mockStripeConstructEvent).toHaveBeenCalledWith(
        mockReq.body,
        'mock_signature',
        'mock_stripe_webhook_secret'
      );
      expect(paymentService.processStripeWebhook).toHaveBeenCalledWith(mockReq.body);
    });

    it('should return 400 if stripe-signature header is missing', async () => {
      mockReq.headers = {};
      mockReq.body = { id: 'evt_test', type: 'payment_intent.succeeded' };

      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Missing stripe-signature header' });
      expect(mockStripeConstructEvent).not.toHaveBeenCalled();
      expect(paymentService.processStripeWebhook).not.toHaveBeenCalled();
    });

    it('should return 400 if webhook signature verification fails', async () => {
      mockReq.headers = { 'stripe-signature': 'invalid_signature' };
      mockReq.body = { id: 'evt_test', type: 'payment_intent.succeeded' };

      mockStripeConstructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload.');
      });

      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Webhook Error: No signatures found matching the expected signature for payload.',
      });
      expect(mockStripeConstructEvent).toHaveBeenCalled();
      expect(paymentService.processStripeWebhook).not.toHaveBeenCalled();
    });

    it('should return 400 if an error occurs during webhook processing', async () => {
      mockReq.headers = { 'stripe-signature': 'mock_signature' };
      mockReq.body = { id: 'evt_test', type: 'payment_intent.succeeded' };

      mockStripeConstructEvent.mockReturnValue(mockReq.body);
      (paymentService.processStripeWebhook as jest.Mock).mockRejectedValue(new Error('Processing error'));

      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Webhook Error: Processing error' });
      expect(mockStripeConstructEvent).toHaveBeenCalled();
      expect(paymentService.processStripeWebhook).toHaveBeenCalled();
    });
  });

  describe('handleFlutterwaveWebhook', () => {
    it('should handle Flutterwave webhook successfully and return 200 status', async () => {
      mockReq.body = { event: 'charge.completed', data: { status: 'successful' } };

      (paymentService.processFlutterwaveWebhook as jest.Mock).mockResolvedValue(true);

      await handleFlutterwaveWebhook(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ received: true });
      expect(paymentService.processFlutterwaveWebhook).toHaveBeenCalledWith(mockReq.body);
    });

    it('should return 400 if an error occurs during webhook processing', async () => {
      mockReq.body = { event: 'charge.completed', data: { status: 'successful' } };

      (paymentService.processFlutterwaveWebhook as jest.Mock).mockRejectedValue(new Error('Processing error'));

      await handleFlutterwaveWebhook(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Webhook Error: Processing error' });
      expect(paymentService.processFlutterwaveWebhook).toHaveBeenCalledWith(mockReq.body);
    });
  });

  describe('getTransactionById', () => {
    it('should return a transaction by ID', async () => {
      const mockTransaction = {
        id: 1,
        buyer_id: 'user123',
        amount: 100,
        currency: 'usd',
      };
      mockReq.params = { id: '1' };
      (mockReq as any).user = { id: 'user123', role: 'user' };

      (paymentService.getTransactionById as jest.Mock).mockResolvedValue(mockTransaction);

      await getTransactionById(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ transaction: mockTransaction });
      expect(paymentService.getTransactionById).toHaveBeenCalledWith(1);
    });

    it('should return 400 if transaction ID is missing', async () => {
      mockReq.params = {};

      await getTransactionById(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Transaction ID is required' });
      expect(paymentService.getTransactionById).not.toHaveBeenCalled();
    });

    it('should return 404 if transaction is not found', async () => {
      mockReq.params = { id: '999' };
      (mockReq as any).user = { id: 'user123', role: 'user' };

      (paymentService.getTransactionById as jest.Mock).mockResolvedValue(null);

      await getTransactionById(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Transaction not found' });
      expect(paymentService.getTransactionById).toHaveBeenCalledWith(999);
    });

    it('should return 403 if user is not authorized to view transaction', async () => {
      const mockTransaction = {
        id: 1,
        buyer_id: 'anotherUser',
        amount: 100,
        currency: 'usd',
      };
      mockReq.params = { id: '1' };
      (mockReq as any).user = { id: 'user123', role: 'user' };

      (paymentService.getTransactionById as jest.Mock).mockResolvedValue(mockTransaction);

      await getTransactionById(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Not authorized to view this transaction' });
      expect(paymentService.getTransactionById).toHaveBeenCalledWith(1);
    });

    it('should allow admin to view any transaction', async () => {
      const mockTransaction = {
        id: 1,
        buyer_id: 'anotherUser',
        amount: 100,
        currency: 'usd',
      };
      mockReq.params = { id: '1' };
      (mockReq as any).user = { id: 'adminUser', role: 'admin' };

      (paymentService.getTransactionById as jest.Mock).mockResolvedValue(mockTransaction);

      await getTransactionById(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ transaction: mockTransaction });
      expect(paymentService.getTransactionById).toHaveBeenCalledWith(1);
    });

    it('should return 500 if an error occurs', async () => {
      mockReq.params = { id: '1' };
      (mockReq as any).user = { id: 'user123', role: 'user' };

      (paymentService.getTransactionById as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getTransactionById(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Server error retrieving transaction' });
      expect(paymentService.getTransactionById).toHaveBeenCalledWith(1);
    });
  });

  describe('getUserTransactions', () => {
    it('should return user transactions', async () => {
      const mockTransactions = [
        { id: 1, buyer_id: 'user123', amount: 100, currency: 'usd' },
        { id: 2, buyer_id: 'user123', amount: 200, currency: 'usd' },
      ];
      const mockUserId = 'user123';
      (mockReq as any).user = { id: mockUserId };

      (paymentService.getUserTransactions as jest.Mock).mockResolvedValue(mockTransactions);

      await getUserTransactions(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        count: mockTransactions.length,
        transactions: mockTransactions,
      });
      expect(paymentService.getUserTransactions).toHaveBeenCalledWith(mockUserId);
    });

    it('should return 500 if an error occurs', async () => {
      const mockUserId = 'user123';
      (mockReq as any).user = { id: mockUserId };

      (paymentService.getUserTransactions as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getUserTransactions(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Server error retrieving transactions' });
      expect(paymentService.getUserTransactions).toHaveBeenCalledWith(mockUserId);
    });
  });
});

