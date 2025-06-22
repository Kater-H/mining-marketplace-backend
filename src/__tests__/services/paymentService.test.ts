// Mock external dependencies before importing paymentService
const mockStripeInstance = {
  paymentIntents: {
    create: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

const mockFlutterwaveInstance = {
  Payments: {
    initiate: jest.fn(),
  },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripeInstance);
});

jest.mock('flutterwave-node-v3', () => {
  return jest.fn().mockImplementation(() => mockFlutterwaveInstance);
});

jest.mock('../../config/database', () => ({
  pgPool: {
    connect: jest.fn(),
    query: jest.fn(),
  },
}));

jest.mock('../../config/config', () => ({
  config: {
    stripeSecretKey: 'sk_test_mock_key',
    stripeWebhookSecret: 'whsec_mock_secret',
    flutterwavePublicKey: 'FLWPUBK_TEST_mock',
    flutterwaveSecretKey: 'FLWSECK_TEST_mock',
  },
}));

import { PaymentService } from '../../services/paymentService';
import { pgPool } from '../../config/database';

// Get the mocked functions
const mockPgPool = pgPool as jest.Mocked<typeof pgPool>;

// Mock client object
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

describe('PaymentService', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup database mocks
    mockPgPool.connect.mockResolvedValue(mockClient as any);
    
    // Create the service instance
    paymentService = new PaymentService();
  });

  describe('createStripePayment', () => {
    const mockPaymentData = {
      amount: 100.50,
      currency: 'USD',
      buyerId: 1,
      listingId: 123
    };

    const mockPaymentIntent = {
      id: 'pi_mock_payment_intent',
      client_secret: 'pi_mock_payment_intent_secret_mock',
      amount: 10050,
      currency: 'usd',
    };

    test('should create Stripe payment successfully', async () => {
      const mockTransactionResult = { rows: [{ id: 456 }] };

      mockStripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any);
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(mockTransactionResult) // INSERT transaction
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await paymentService.createStripePayment(
        mockPaymentData.amount,
        mockPaymentData.currency,
        mockPaymentData.buyerId,
        mockPaymentData.listingId
      );

      expect(result).toEqual({
        clientSecret: 'pi_mock_payment_intent_secret_mock',
        transactionId: 456
      });

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith({
        amount: 10050, // 100.50 * 100
        currency: 'usd',
        metadata: {
          buyer_id: '1',
          listing_id: '123',
        },
      });

      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle Stripe API errors', async () => {
      const stripeError = new Error('Stripe API error');
      mockStripeInstance.paymentIntents.create.mockRejectedValue(stripeError);

      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN

      await expect(paymentService.createStripePayment(
        mockPaymentData.amount,
        mockPaymentData.currency,
        mockPaymentData.buyerId,
        mockPaymentData.listingId
      )).rejects.toThrow('Stripe API error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      
      mockStripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any);
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(dbError); // INSERT transaction fails

      await expect(paymentService.createStripePayment(
        mockPaymentData.amount,
        mockPaymentData.currency,
        mockPaymentData.buyerId,
        mockPaymentData.listingId
      )).rejects.toThrow('Database connection failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('createFlutterwavePayment', () => {
    const mockPaymentData = {
      amount: 50000,
      currency: 'NGN',
      buyerId: 2,
      listingId: 789,
      customer: {
        email: 'buyer@example.com',
        name: 'John Buyer',
        phone_number: '+2348123456789'
      },
      redirectUrl: 'https://example.com/callback'
    };

    const mockFlutterwaveResponse = {
      status: 'success',
      data: {
        link: 'https://checkout.flutterwave.com/v3/hosted/pay/mock_link'
      }
    };

    test('should create Flutterwave payment successfully', async () => {
      const mockTransactionResult = { rows: [{ id: 999 }] };

      mockFlutterwaveInstance.Payments.initiate.mockResolvedValue(mockFlutterwaveResponse);
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(mockTransactionResult) // INSERT transaction
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await paymentService.createFlutterwavePayment(
        mockPaymentData.amount,
        mockPaymentData.currency,
        mockPaymentData.buyerId,
        mockPaymentData.listingId,
        mockPaymentData.customer,
        mockPaymentData.redirectUrl
      );

      expect(result).toEqual({
        paymentLink: 'https://checkout.flutterwave.com/v3/hosted/pay/mock_link',
        transactionId: 999
      });

      expect(mockFlutterwaveInstance.Payments.initiate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50000,
          currency: 'NGN',
          redirect_url: 'https://example.com/callback',
          customer: mockPaymentData.customer,
          customizations: {
            title: 'Mining Marketplace Payment',
            description: 'Payment for listing 789',
          },
          meta: {
            buyer_id: 2,
            listing_id: 789,
          },
        })
      );

      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle Flutterwave initialization failure', async () => {
      const failedResponse = {
        status: 'error',
        message: 'Invalid parameters'
      };

      mockFlutterwaveInstance.Payments.initiate.mockResolvedValue(failedResponse);
      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN

      await expect(paymentService.createFlutterwavePayment(
        mockPaymentData.amount,
        mockPaymentData.currency,
        mockPaymentData.buyerId,
        mockPaymentData.listingId,
        mockPaymentData.customer,
        mockPaymentData.redirectUrl
      )).rejects.toThrow('Failed to initialize Flutterwave payment');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('processStripeWebhook', () => {
    test('should process payment_intent.succeeded event', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_mock_success',
            status: 'succeeded'
          }
        }
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // UPDATE transaction
        .mockResolvedValueOnce(undefined) // INSERT webhook
        .mockResolvedValueOnce(undefined); // COMMIT

      await paymentService.processStripeWebhook(mockEvent as any);

      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');
    });

    test('should process payment_intent.payment_failed event', async () => {
      const mockEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_mock_failed',
            status: 'failed'
          }
        }
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // UPDATE transaction
        .mockResolvedValueOnce(undefined) // INSERT webhook
        .mockResolvedValueOnce(undefined); // COMMIT

      await paymentService.processStripeWebhook(mockEvent as any);

      expect(mockClient.query).toHaveBeenCalledTimes(4);
    });

    test('should handle unrecognized event types', async () => {
      const mockEvent = {
        type: 'customer.created',
        data: {
          object: {
            id: 'cus_mock'
          }
        }
      };

      // Should not throw error for unhandled events
      await expect(paymentService.processStripeWebhook(mockEvent as any)).resolves.not.toThrow();
    });
  });

  describe('processFlutterwaveWebhook', () => {
    test('should process successful payment webhook', async () => {
      const mockPayload = {
        status: 'successful',
        tx_ref: 'tx_123456789_1_456',
        transaction_id: 'fw_tx_123'
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // UPDATE transaction
        .mockResolvedValueOnce(undefined) // INSERT webhook
        .mockResolvedValueOnce(undefined); // COMMIT

      await paymentService.processFlutterwaveWebhook(mockPayload);

      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');
    });

    test('should process failed payment webhook', async () => {
      const mockPayload = {
        status: 'failed',
        tx_ref: 'tx_123456789_1_456',
        transaction_id: 'fw_tx_456'
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // UPDATE transaction
        .mockResolvedValueOnce(undefined) // INSERT webhook
        .mockResolvedValueOnce(undefined); // COMMIT

      await paymentService.processFlutterwaveWebhook(mockPayload);

      expect(mockClient.query).toHaveBeenCalledTimes(4);
    });
  });

  describe('getTransactionById', () => {
    const mockTransaction = {
      id: 1,
      buyer_id: 123,
      listing_id: 456,
      amount: 100.50,
      currency: 'USD',
      status: 'completed',
      commodity_type: 'Gold',
      volume: 50,
      buyer_email: 'buyer@example.com'
    };

    test('should get transaction by ID successfully', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [mockTransaction] });

      const result = await paymentService.getTransactionById(1);

      expect(result).toEqual(mockTransaction);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.id = $1'),
        [1]
      );
    });

    test('should return null when transaction not found', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] });

      const result = await paymentService.getTransactionById(999);

      expect(result).toBeNull();
    });

    test('should handle database errors', async () => {
      const error = new Error('Database query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(paymentService.getTransactionById(1)).rejects.toThrow('Database query failed');
    });
  });

  describe('getUserTransactions', () => {
    const mockTransactions = [
      {
        id: 1,
        buyer_id: 123,
        listing_id: 456,
        amount: 100.50,
        currency: 'USD',
        status: 'completed',
        commodity_type: 'Gold',
        volume: 50
      },
      {
        id: 2,
        buyer_id: 123,
        listing_id: 789,
        amount: 75.25,
        currency: 'EUR',
        status: 'pending',
        commodity_type: 'Silver',
        volume: 25
      }
    ];

    test('should get user transactions successfully', async () => {
      mockPgPool.query.mockResolvedValue({ rows: mockTransactions });

      const result = await paymentService.getUserTransactions(123);

      expect(result).toEqual(mockTransactions);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.buyer_id = $1'),
        [123]
      );
    });

    test('should return empty array when no transactions found', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] });

      const result = await paymentService.getUserTransactions(999);

      expect(result).toEqual([]);
    });

    test('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(paymentService.getUserTransactions(123)).rejects.toThrow('Database connection failed');
    });
  });

  describe('constructor', () => {
    test('should create PaymentService instance', () => {
      const service = new PaymentService();
      expect(service).toBeInstanceOf(PaymentService);
    });
  });
});

