// Mock external dependencies before importing transactionModel
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('../../config/database', () => ({
  pgPool: {
    connect: jest.fn(),
    query: jest.fn(),
  },
}));

import { 
  TransactionModel, 
  CreateTransactionData, 
  UpdateTransactionData, 
  Transaction,
  TransactionFilter,
  TransactionStatus
} from '../../models/transactionModel';
import { pgPool } from '../../config/database';

// Get the mocked functions
const mockPgPool = pgPool as jest.Mocked<typeof pgPool>;

describe('TransactionModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default database connection mock
    mockPgPool.connect.mockResolvedValue(mockClient as any);
  });

  describe('findById', () => {
    const mockTransaction: Transaction = {
      id: 1,
      buyer_id: 1,
      seller_id: 2,
      listing_id: 1,
      amount: 1800.00,
      currency: 'USD',
      payment_method: 'card',
      payment_provider: 'stripe',
      payment_id: 'pi_test123',
      status: 'completed',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      completed_at: new Date('2024-01-01'),
    };

    test('should find transaction by ID successfully', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [mockTransaction] } as any);

      const result = await TransactionModel.findById(1);

      expect(result).toEqual(mockTransaction);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT t.*'),
        [1]
      );
    });

    test('should return null when transaction not found', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await TransactionModel.findById(999);

      expect(result).toBeNull();
    });

    test('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(TransactionModel.findById(1)).rejects.toThrow('Database connection failed');
    });
  });

  describe('findByBuyerId', () => {
    const mockTransactions: Transaction[] = [
      {
        id: 1,
        buyer_id: 1,
        seller_id: 2,
        listing_id: 1,
        amount: 1800.00,
        currency: 'USD',
        payment_method: 'card',
        payment_provider: 'stripe',
        payment_id: 'pi_test123',
        status: 'completed',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      },
      {
        id: 2,
        buyer_id: 1,
        seller_id: 3,
        listing_id: 2,
        amount: 500.00,
        currency: 'USD',
        payment_method: 'card',
        payment_provider: 'flutterwave',
        payment_id: 'fw_test456',
        status: 'pending',
        created_at: new Date('2024-01-02'),
        updated_at: new Date('2024-01-02'),
      },
    ] as Transaction[];

    test('should find transactions by buyer ID successfully', async () => {
      mockPgPool.query.mockResolvedValue({ rows: mockTransactions } as any);

      const result = await TransactionModel.findByBuyerId(1);

      expect(result).toEqual(mockTransactions);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.buyer_id = $1'),
        [1]
      );
    });

    test('should return empty array when no transactions found', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await TransactionModel.findByBuyerId(999);

      expect(result).toEqual([]);
    });

    test('should handle database errors', async () => {
      const error = new Error('Buyer transactions query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(TransactionModel.findByBuyerId(1)).rejects.toThrow('Buyer transactions query failed');
    });
  });

  describe('findBySellerId', () => {
    const mockTransactions: Transaction[] = [
      {
        id: 3,
        buyer_id: 2,
        seller_id: 1,
        listing_id: 3,
        amount: 2500.00,
        currency: 'USD',
        payment_method: 'card',
        payment_provider: 'stripe',
        payment_id: 'pi_test789',
        status: 'completed',
        created_at: new Date('2024-01-03'),
        updated_at: new Date('2024-01-03'),
      },
    ] as Transaction[];

    test('should find transactions by seller ID successfully', async () => {
      mockPgPool.query.mockResolvedValue({ rows: mockTransactions } as any);

      const result = await TransactionModel.findBySellerId(1);

      expect(result).toEqual(mockTransactions);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.seller_id = $1'),
        [1]
      );
    });

    test('should return empty array when no transactions found', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await TransactionModel.findBySellerId(999);

      expect(result).toEqual([]);
    });

    test('should handle database errors', async () => {
      const error = new Error('Seller transactions query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(TransactionModel.findBySellerId(1)).rejects.toThrow('Seller transactions query failed');
    });
  });

  describe('findByPaymentId', () => {
    const mockTransaction: Transaction = {
      id: 1,
      buyer_id: 1,
      seller_id: 2,
      listing_id: 1,
      amount: 1800.00,
      currency: 'USD',
      payment_method: 'card',
      payment_provider: 'stripe',
      payment_id: 'pi_test123',
      status: 'completed',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    };

    test('should find transaction by payment ID successfully', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [mockTransaction] } as any);

      const result = await TransactionModel.findByPaymentId('pi_test123', 'stripe');

      expect(result).toEqual(mockTransaction);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE payment_id = $1 AND payment_provider = $2'),
        ['pi_test123', 'stripe']
      );
    });

    test('should return null when transaction not found', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await TransactionModel.findByPaymentId('nonexistent', 'stripe');

      expect(result).toBeNull();
    });

    test('should handle database errors', async () => {
      const error = new Error('Payment ID query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(TransactionModel.findByPaymentId('pi_test123', 'stripe')).rejects.toThrow('Payment ID query failed');
    });
  });

  describe('findByListingId', () => {
    const mockTransactions: Transaction[] = [
      {
        id: 1,
        buyer_id: 1,
        seller_id: 2,
        listing_id: 1,
        amount: 1800.00,
        currency: 'USD',
        payment_method: 'card',
        payment_provider: 'stripe',
        payment_id: 'pi_test123',
        status: 'completed',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      },
    ] as Transaction[];

    test('should find transactions by listing ID successfully', async () => {
      mockPgPool.query.mockResolvedValue({ rows: mockTransactions } as any);

      const result = await TransactionModel.findByListingId(1);

      expect(result).toEqual(mockTransactions);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.listing_id = $1'),
        [1]
      );
    });

    test('should return empty array when no transactions found', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await TransactionModel.findByListingId(999);

      expect(result).toEqual([]);
    });

    test('should handle database errors', async () => {
      const error = new Error('Listing transactions query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(TransactionModel.findByListingId(1)).rejects.toThrow('Listing transactions query failed');
    });
  });

  describe('create', () => {
    const mockTransactionData: CreateTransactionData = {
      buyer_id: 1,
      seller_id: 2,
      listing_id: 1,
      amount: 1800.00,
      currency: 'USD',
      payment_method: 'card',
      payment_provider: 'stripe',
      payment_id: 'pi_test123',
      status: 'pending',
      metadata: { test: 'data' }
    };

    const mockCreatedTransaction: Transaction = {
      id: 1,
      ...mockTransactionData,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    } as Transaction;

    test('should create transaction successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCreatedTransaction] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await TransactionModel.create(mockTransactionData);

      expect(result).toEqual(mockCreatedTransaction);
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should create transaction with minimal data', async () => {
      const minimalTransactionData: CreateTransactionData = {
        buyer_id: 1,
        listing_id: 1,
        amount: 500.00,
        currency: 'USD',
        payment_method: 'card',
        payment_provider: 'flutterwave',
        payment_id: 'fw_test456',
      };

      const mockMinimalTransaction: Transaction = {
        id: 2,
        ...minimalTransactionData,
        status: 'pending',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      } as Transaction;

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockMinimalTransaction] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await TransactionModel.create(minimalTransactionData);

      expect(result).toEqual(mockMinimalTransaction);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('INSERT INTO transactions'),
        [1, null, 1, 500.00, 'USD', 'card', 'flutterwave', 'fw_test456', 'pending', null]
      );
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Constraint violation');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // INSERT fails

      await expect(TransactionModel.create(mockTransactionData)).rejects.toThrow('Constraint violation');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const mockUpdateData: UpdateTransactionData = {
      status: 'completed',
      completed_at: new Date('2024-01-02'),
      metadata: { updated: true }
    };

    const mockUpdatedTransaction: Transaction = {
      id: 1,
      buyer_id: 1,
      seller_id: 2,
      listing_id: 1,
      amount: 1800.00,
      currency: 'USD',
      payment_method: 'card',
      payment_provider: 'stripe',
      payment_id: 'pi_test123',
      status: 'completed',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02'),
      completed_at: new Date('2024-01-02'),
    };

    test('should update transaction successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUpdatedTransaction] }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await TransactionModel.update(1, mockUpdateData);

      expect(result).toEqual(mockUpdatedTransaction);
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should return null when transaction not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns no rows
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await TransactionModel.update(999, mockUpdateData);

      expect(result).toBeNull();
    });

    test('should handle empty update data', async () => {
      await expect(TransactionModel.update(1, {})).rejects.toThrow('No fields to update');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Update failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // UPDATE fails

      await expect(TransactionModel.update(1, mockUpdateData)).rejects.toThrow('Update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should update single field', async () => {
      const singleFieldUpdate = { status: 'failed' as TransactionStatus };
      
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUpdatedTransaction] }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await TransactionModel.update(1, singleFieldUpdate);

      expect(result).toEqual(mockUpdatedTransaction);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('status = $1'),
        ['failed', 1]
      );
    });

    test('should handle metadata serialization', async () => {
      const metadataUpdate = { metadata: { complex: { nested: 'data' } } };
      
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUpdatedTransaction] }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      await TransactionModel.update(1, metadataUpdate);

      expect(mockClient.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('metadata = $1'),
        [JSON.stringify({ complex: { nested: 'data' } }), 1]
      );
    });
  });

  describe('updateStatus', () => {
    const mockUpdatedTransaction: Transaction = {
      id: 1,
      buyer_id: 1,
      seller_id: 2,
      listing_id: 1,
      amount: 1800.00,
      currency: 'USD',
      payment_method: 'card',
      payment_provider: 'stripe',
      payment_id: 'pi_test123',
      status: 'completed',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02'),
      completed_at: new Date('2024-01-02'),
    };

    test('should update status to completed successfully', async () => {
      // Mock the update method
      jest.spyOn(TransactionModel, 'update').mockResolvedValue(mockUpdatedTransaction);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await TransactionModel.updateStatus(1, 'completed');

      expect(result).toEqual(mockUpdatedTransaction);
      expect(TransactionModel.update).toHaveBeenCalledWith(1, {
        status: 'completed',
        completed_at: expect.any(Date)
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should update status to failed with reason', async () => {
      const failedTransaction = { ...mockUpdatedTransaction, status: 'failed' as TransactionStatus };
      jest.spyOn(TransactionModel, 'update').mockResolvedValue(failedTransaction);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await TransactionModel.updateStatus(1, 'failed', 'Payment declined');

      expect(result).toEqual(failedTransaction);
      expect(TransactionModel.update).toHaveBeenCalledWith(1, {
        status: 'failed',
        failure_reason: 'Payment declined'
      });
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Status update failed');
      jest.spyOn(TransactionModel, 'update').mockRejectedValue(error);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN

      await expect(TransactionModel.updateStatus(1, 'completed')).rejects.toThrow('Status update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    test('should delete transaction successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1 }) // DELETE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await TransactionModel.delete(1);

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 'DELETE FROM transactions WHERE id = $1', [1]);
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should return false when transaction not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rowCount: 0 }) // DELETE returns 0 rows
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await TransactionModel.delete(999);

      expect(result).toBe(false);
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Delete failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // DELETE fails

      await expect(TransactionModel.delete(1)).rejects.toThrow('Delete failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle null rowCount', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rowCount: null }) // DELETE returns null rowCount
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await TransactionModel.delete(1);

      expect(result).toBe(false);
    });
  });

  describe('findWithFilters', () => {
    const mockFilteredTransactions: Transaction[] = [
      {
        id: 1,
        buyer_id: 1,
        seller_id: 2,
        listing_id: 1,
        amount: 1800.00,
        currency: 'USD',
        payment_method: 'card',
        payment_provider: 'stripe',
        payment_id: 'pi_test123',
        status: 'completed',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      },
    ] as Transaction[];

    test('should find transactions with buyer ID filter', async () => {
      const filters: TransactionFilter = {
        buyer_id: 1,
        page: 1,
        limit: 10,
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredTransactions } as any);

      const result = await TransactionModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredTransactions);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('t.buyer_id = $1'),
        [1, 10, 0]
      );
    });

    test('should find transactions with status filter', async () => {
      const filters: TransactionFilter = {
        status: 'completed',
        page: 1,
        limit: 5,
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredTransactions } as any);

      const result = await TransactionModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredTransactions);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('t.status = $1'),
        ['completed', 5, 0]
      );
    });

    test('should find transactions with amount range filters', async () => {
      const filters: TransactionFilter = {
        min_amount: 1000,
        max_amount: 2000,
        page: 1,
        limit: 10,
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredTransactions } as any);

      const result = await TransactionModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredTransactions);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('t.amount >= $1 AND t.amount <= $2'),
        [1000, 2000, 10, 0]
      );
    });

    test('should find transactions with date range filters', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');
      const filters: TransactionFilter = {
        date_from: dateFrom,
        date_to: dateTo,
        page: 2,
        limit: 10,
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredTransactions } as any);

      const result = await TransactionModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredTransactions);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('t.created_at >= $1 AND t.created_at <= $2'),
        [dateFrom, dateTo, 10, 10] // page 2 with limit 10 = offset 10
      );
    });

    test('should find transactions with payment provider filter', async () => {
      const filters: TransactionFilter = {
        payment_provider: 'stripe',
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredTransactions } as any);

      const result = await TransactionModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredTransactions);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('t.payment_provider = $1'),
        ['stripe', 10, 0]
      );
    });

    test('should find transactions with custom sorting', async () => {
      const filters: TransactionFilter = {
        sort_by: 'amount',
        sort_direction: 'asc',
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredTransactions } as any);

      const result = await TransactionModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredTransactions);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY t.amount ASC'),
        [10, 0]
      );
    });

    test('should find transactions with multiple filters combined', async () => {
      const filters: TransactionFilter = {
        buyer_id: 1,
        status: 'completed',
        payment_provider: 'stripe',
        min_amount: 1000,
        max_amount: 2000,
        currency: 'USD',
        sort_by: 'created_at',
        sort_direction: 'desc',
        page: 1,
        limit: 5,
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredTransactions } as any);

      const result = await TransactionModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredTransactions);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('t.buyer_id = $1'),
        [1, 'completed', 'stripe', 'USD', 1000, 2000, 5, 0]
      );
    });

    test('should use default pagination and sorting', async () => {
      const filters: TransactionFilter = {};

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredTransactions } as any);

      const result = await TransactionModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredTransactions);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY t.created_at DESC'),
        [10, 0]
      );
    });

    test('should handle database errors', async () => {
      const error = new Error('Filter query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(TransactionModel.findWithFilters({})).rejects.toThrow('Filter query failed');
    });
  });

  describe('getTotalCount', () => {
    test('should get total count with filters', async () => {
      const filters: TransactionFilter = {
        status: 'completed',
        payment_provider: 'stripe',
      };

      mockPgPool.query.mockResolvedValue({ rows: [{ count: '25' }] } as any);

      const result = await TransactionModel.getTotalCount(filters);

      expect(result).toBe(25);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) FROM transactions'),
        ['completed', 'stripe']
      );
    });

    test('should get total count without filters', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [{ count: '100' }] } as any);

      const result = await TransactionModel.getTotalCount({});

      expect(result).toBe(100);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) FROM transactions'),
        []
      );
    });

    test('should handle database errors', async () => {
      const error = new Error('Count query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(TransactionModel.getTotalCount({})).rejects.toThrow('Count query failed');
    });
  });

  describe('findAll', () => {
    const mockTransactions: Transaction[] = [
      {
        id: 1,
        buyer_id: 1,
        seller_id: 2,
        listing_id: 1,
        amount: 1800.00,
        currency: 'USD',
        payment_method: 'card',
        payment_provider: 'stripe',
        payment_id: 'pi_test123',
        status: 'completed',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      },
      {
        id: 2,
        buyer_id: 2,
        seller_id: 1,
        listing_id: 2,
        amount: 500.00,
        currency: 'USD',
        payment_method: 'card',
        payment_provider: 'flutterwave',
        payment_id: 'fw_test456',
        status: 'pending',
        created_at: new Date('2024-01-02'),
        updated_at: new Date('2024-01-02'),
      },
    ] as Transaction[];

    test('should find all transactions with pagination', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '50' }] }) // COUNT query
        .mockResolvedValueOnce({ rows: mockTransactions }); // SELECT query

      const result = await TransactionModel.findAll(1, 10);

      expect(result).toEqual({
        transactions: mockTransactions,
        total: 50
      });

      expect(mockPgPool.query).toHaveBeenCalledTimes(2);
      expect(mockPgPool.query).toHaveBeenNthCalledWith(1, 'SELECT COUNT(*) FROM transactions');
      expect(mockPgPool.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [10, 0]
      );
    });

    test('should handle pagination correctly', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // COUNT query
        .mockResolvedValueOnce({ rows: mockTransactions }); // SELECT query

      const result = await TransactionModel.findAll(3, 20);

      expect(result.total).toBe(100);
      expect(mockPgPool.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [20, 40] // page 3 with limit 20 = offset 40
      );
    });

    test('should use default pagination values', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '15' }] }) // COUNT query
        .mockResolvedValueOnce({ rows: mockTransactions }); // SELECT query

      const result = await TransactionModel.findAll();

      expect(mockPgPool.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [10, 0] // default page 1, limit 10
      );
    });

    test('should handle database errors', async () => {
      const error = new Error('Find all query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(TransactionModel.findAll()).rejects.toThrow('Find all query failed');
    });
  });

  describe('getStatistics', () => {
    const mockStats = {
      total_transactions: 100,
      total_amount: 50000.00,
      completed_transactions: 80,
      completed_amount: 45000.00,
      pending_transactions: 15,
      failed_transactions: 5,
      average_transaction_amount: 500.00
    };

    test('should get statistics without filters', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [mockStats] } as any);

      const result = await TransactionModel.getStatistics();

      expect(result).toEqual(mockStats);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        []
      );
    });

    test('should get statistics with filters', async () => {
      const filters: TransactionFilter = {
        buyer_id: 1,
        date_from: new Date('2024-01-01'),
        date_to: new Date('2024-01-31'),
      };

      mockPgPool.query.mockResolvedValue({ rows: [mockStats] } as any);

      const result = await TransactionModel.getStatistics(filters);

      expect(result).toEqual(mockStats);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('buyer_id = $1'),
        [1, new Date('2024-01-01'), new Date('2024-01-31')]
      );
    });

    test('should handle database errors', async () => {
      const error = new Error('Statistics query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(TransactionModel.getStatistics()).rejects.toThrow('Statistics query failed');
    });
  });

  describe('processRefund', () => {
    const mockRefundedTransaction: Transaction = {
      id: 1,
      buyer_id: 1,
      seller_id: 2,
      listing_id: 1,
      amount: 1800.00,
      currency: 'USD',
      payment_method: 'card',
      payment_provider: 'stripe',
      payment_id: 'pi_test123',
      status: 'completed',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02'),
      refund_amount: 1800.00,
      refund_status: 'processing',
    };

    test('should process refund successfully', async () => {
      jest.spyOn(TransactionModel, 'update').mockResolvedValue(mockRefundedTransaction);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await TransactionModel.processRefund(1, 1800.00, 'Customer request');

      expect(result).toEqual(mockRefundedTransaction);
      expect(TransactionModel.update).toHaveBeenCalledWith(1, {
        refund_amount: 1800.00,
        refund_status: 'processing',
        metadata: { refund_reason: 'Customer request' }
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Refund processing failed');
      jest.spyOn(TransactionModel, 'update').mockRejectedValue(error);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN

      await expect(TransactionModel.processRefund(1, 1800.00)).rejects.toThrow('Refund processing failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('completeRefund', () => {
    const mockCompletedRefundTransaction: Transaction = {
      id: 1,
      buyer_id: 1,
      seller_id: 2,
      listing_id: 1,
      amount: 1800.00,
      currency: 'USD',
      payment_method: 'card',
      payment_provider: 'stripe',
      payment_id: 'pi_test123',
      status: 'refunded',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02'),
      refund_amount: 1800.00,
      refund_status: 'completed',
    };

    test('should complete refund successfully', async () => {
      jest.spyOn(TransactionModel, 'update').mockResolvedValue(mockCompletedRefundTransaction);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await TransactionModel.completeRefund(1);

      expect(result).toEqual(mockCompletedRefundTransaction);
      expect(TransactionModel.update).toHaveBeenCalledWith(1, {
        status: 'refunded',
        refund_status: 'completed'
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Refund completion failed');
      jest.spyOn(TransactionModel, 'update').mockRejectedValue(error);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN

      await expect(TransactionModel.completeRefund(1)).rejects.toThrow('Refund completion failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});

