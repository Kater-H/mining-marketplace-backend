import { pgPool } from '../config/database';

// Transaction interfaces
export interface Transaction {
  id: number;
  buyer_id: number;
  seller_id?: number;
  listing_id: number;
  amount: number;
  currency: string;
  payment_method: string;
  payment_provider: string;
  payment_id: string;
  status: TransactionStatus;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  failure_reason?: string;
  refund_amount?: number;
  refund_status?: RefundStatus;
  metadata?: any;
}

export interface CreateTransactionData {
  buyer_id: number;
  seller_id?: number;
  listing_id: number;
  amount: number;
  currency: string;
  payment_method: string;
  payment_provider: string;
  payment_id: string;
  status?: TransactionStatus;
  metadata?: any;
}

export interface UpdateTransactionData {
  status?: TransactionStatus;
  completed_at?: Date;
  failure_reason?: string;
  refund_amount?: number;
  refund_status?: RefundStatus;
  metadata?: any;
}

export interface TransactionFilter {
  buyer_id?: number;
  seller_id?: number;
  listing_id?: number;
  status?: TransactionStatus;
  payment_provider?: string;
  payment_method?: string;
  currency?: string;
  min_amount?: number;
  max_amount?: number;
  date_from?: Date;
  date_to?: Date;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
export type RefundStatus = 'none' | 'pending' | 'processing' | 'completed' | 'failed';

export class TransactionModel {
  // Find transaction by ID
  static async findById(id: number): Promise<Transaction | null> {
    try {
      const query = `
        SELECT t.*, 
               u_buyer.email as buyer_email,
               u_seller.email as seller_email,
               ml.commodity_type,
               ml.volume
        FROM transactions t
        LEFT JOIN users u_buyer ON t.buyer_id = u_buyer.id
        LEFT JOIN users u_seller ON t.seller_id = u_seller.id
        LEFT JOIN mineral_listings ml ON t.listing_id = ml.id
        WHERE t.id = $1
      `;

      const result = await pgPool.query(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding transaction by ID:', error);
      throw error;
    }
  }

  // Find transactions by buyer ID
  static async findByBuyerId(buyerId: number): Promise<Transaction[]> {
    try {
      const query = `
        SELECT t.*, 
               ml.commodity_type,
               ml.volume,
               u_seller.email as seller_email
        FROM transactions t
        LEFT JOIN mineral_listings ml ON t.listing_id = ml.id
        LEFT JOIN users u_seller ON t.seller_id = u_seller.id
        WHERE t.buyer_id = $1
        ORDER BY t.created_at DESC
      `;

      const result = await pgPool.query(query, [buyerId]);
      return result.rows;
    } catch (error) {
      console.error('Error finding transactions by buyer ID:', error);
      throw error;
    }
  }

  // Find transactions by seller ID
  static async findBySellerId(sellerId: number): Promise<Transaction[]> {
    try {
      const query = `
        SELECT t.*, 
               ml.commodity_type,
               ml.volume,
               u_buyer.email as buyer_email
        FROM transactions t
        LEFT JOIN mineral_listings ml ON t.listing_id = ml.id
        LEFT JOIN users u_buyer ON t.buyer_id = u_buyer.id
        WHERE t.seller_id = $1
        ORDER BY t.created_at DESC
      `;

      const result = await pgPool.query(query, [sellerId]);
      return result.rows;
    } catch (error) {
      console.error('Error finding transactions by seller ID:', error);
      throw error;
    }
  }

  // Find transaction by payment ID
  static async findByPaymentId(paymentId: string, provider: string): Promise<Transaction | null> {
    try {
      const query = `
        SELECT * FROM transactions 
        WHERE payment_id = $1 AND payment_provider = $2
      `;

      const result = await pgPool.query(query, [paymentId, provider]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding transaction by payment ID:', error);
      throw error;
    }
  }

  // Find transactions by listing ID
  static async findByListingId(listingId: number): Promise<Transaction[]> {
    try {
      const query = `
        SELECT t.*, 
               u_buyer.email as buyer_email,
               u_seller.email as seller_email
        FROM transactions t
        LEFT JOIN users u_buyer ON t.buyer_id = u_buyer.id
        LEFT JOIN users u_seller ON t.seller_id = u_seller.id
        WHERE t.listing_id = $1
        ORDER BY t.created_at DESC
      `;

      const result = await pgPool.query(query, [listingId]);
      return result.rows;
    } catch (error) {
      console.error('Error finding transactions by listing ID:', error);
      throw error;
    }
  }

  // Create new transaction
  static async create(transactionData: CreateTransactionData): Promise<Transaction> {
    const client = await pgPool.connect();

    try {
      await client.query('BEGIN');

      const {
        buyer_id,
        seller_id,
        listing_id,
        amount,
        currency,
        payment_method,
        payment_provider,
        payment_id,
        status = 'pending',
        metadata
      } = transactionData;

      const query = `
        INSERT INTO transactions (
          buyer_id, seller_id, listing_id, amount, currency,
          payment_method, payment_provider, payment_id, status, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        buyer_id,
        seller_id || null,
        listing_id,
        amount,
        currency,
        payment_method,
        payment_provider,
        payment_id,
        status,
        metadata ? JSON.stringify(metadata) : null
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating transaction:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update transaction
  static async update(id: number, updateData: UpdateTransactionData): Promise<Transaction | null> {
    const client = await pgPool.connect();

    try {
      await client.query('BEGIN');

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Build dynamic update query
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'metadata' && value !== null) {
            updateFields.push(`${key} = $${paramCount}`);
            values.push(JSON.stringify(value));
          } else {
            updateFields.push(`${key} = $${paramCount}`);
            values.push(value);
          }
          paramCount++;
        }
      });

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('No fields to update');
      }

      // Add updated_at timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      // Add ID parameter
      values.push(id);

      const query = `
        UPDATE transactions 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      await client.query('COMMIT');

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating transaction:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update transaction status
  static async updateStatus(id: number, status: TransactionStatus, failureReason?: string): Promise<Transaction | null> {
    const client = await pgPool.connect();

    try {
      await client.query('BEGIN');

      const updateData: UpdateTransactionData = { status };

      // Set completion timestamp for completed transactions
      if (status === 'completed') {
        updateData.completed_at = new Date();
      }

      // Set failure reason for failed transactions
      if (status === 'failed' && failureReason) {
        updateData.failure_reason = failureReason;
      }

      const result = await this.update(id, updateData);
      await client.query('COMMIT');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating transaction status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete transaction (soft delete by updating status)
  static async delete(id: number): Promise<boolean> {
    const client = await pgPool.connect();

    try {
      await client.query('BEGIN');

      const query = 'DELETE FROM transactions WHERE id = $1';
      const result = await client.query(query, [id]);

      await client.query('COMMIT');
      return (result.rowCount || 0) > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting transaction:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Find transactions with filters
  static async findWithFilters(filters: TransactionFilter): Promise<Transaction[]> {
    try {
      const conditions: string[] = ['1=1'];
      const values: any[] = [];
      let paramCount = 1;

      // Build WHERE conditions
      if (filters.buyer_id) {
        conditions.push(`t.buyer_id = $${paramCount}`);
        values.push(filters.buyer_id);
        paramCount++;
      }

      if (filters.seller_id) {
        conditions.push(`t.seller_id = $${paramCount}`);
        values.push(filters.seller_id);
        paramCount++;
      }

      if (filters.listing_id) {
        conditions.push(`t.listing_id = $${paramCount}`);
        values.push(filters.listing_id);
        paramCount++;
      }

      if (filters.status) {
        conditions.push(`t.status = $${paramCount}`);
        values.push(filters.status);
        paramCount++;
      }

      if (filters.payment_provider) {
        conditions.push(`t.payment_provider = $${paramCount}`);
        values.push(filters.payment_provider);
        paramCount++;
      }

      if (filters.payment_method) {
        conditions.push(`t.payment_method = $${paramCount}`);
        values.push(filters.payment_method);
        paramCount++;
      }

      if (filters.currency) {
        conditions.push(`t.currency = $${paramCount}`);
        values.push(filters.currency);
        paramCount++;
      }

      if (filters.min_amount) {
        conditions.push(`t.amount >= $${paramCount}`);
        values.push(filters.min_amount);
        paramCount++;
      }

      if (filters.max_amount) {
        conditions.push(`t.amount <= $${paramCount}`);
        values.push(filters.max_amount);
        paramCount++;
      }

      if (filters.date_from) {
        conditions.push(`t.created_at >= $${paramCount}`);
        values.push(filters.date_from);
        paramCount++;
      }

      if (filters.date_to) {
        conditions.push(`t.created_at <= $${paramCount}`);
        values.push(filters.date_to);
        paramCount++;
      }

      // Build ORDER BY clause
      const sortBy = filters.sort_by || 'created_at';
      const sortDirection = filters.sort_direction || 'desc';
      const orderBy = `ORDER BY t.${sortBy} ${sortDirection.toUpperCase()}`;

      // Build LIMIT and OFFSET
      const limit = filters.limit || 10;
      const page = filters.page || 1;
      const offset = (page - 1) * limit;

      values.push(limit, offset);

      const query = `
        SELECT t.*, 
               u_buyer.email as buyer_email,
               u_seller.email as seller_email,
               ml.commodity_type,
               ml.volume
        FROM transactions t
        LEFT JOIN users u_buyer ON t.buyer_id = u_buyer.id
        LEFT JOIN users u_seller ON t.seller_id = u_seller.id
        LEFT JOIN mineral_listings ml ON t.listing_id = ml.id
        WHERE ${conditions.join(' AND ')}
        ${orderBy}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      const result = await pgPool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error finding transactions with filters:', error);
      throw error;
    }
  }

  // Get total count with filters
  static async getTotalCount(filters: TransactionFilter): Promise<number> {
    try {
      const conditions: string[] = ['1=1'];
      const values: any[] = [];
      let paramCount = 1;

      // Build WHERE conditions (same as findWithFilters)
      if (filters.buyer_id) {
        conditions.push(`buyer_id = $${paramCount}`);
        values.push(filters.buyer_id);
        paramCount++;
      }

      if (filters.seller_id) {
        conditions.push(`seller_id = $${paramCount}`);
        values.push(filters.seller_id);
        paramCount++;
      }

      if (filters.listing_id) {
        conditions.push(`listing_id = $${paramCount}`);
        values.push(filters.listing_id);
        paramCount++;
      }

      if (filters.status) {
        conditions.push(`status = $${paramCount}`);
        values.push(filters.status);
        paramCount++;
      }

      if (filters.payment_provider) {
        conditions.push(`payment_provider = $${paramCount}`);
        values.push(filters.payment_provider);
        paramCount++;
      }

      if (filters.payment_method) {
        conditions.push(`payment_method = $${paramCount}`);
        values.push(filters.payment_method);
        paramCount++;
      }

      if (filters.currency) {
        conditions.push(`currency = $${paramCount}`);
        values.push(filters.currency);
        paramCount++;
      }

      if (filters.min_amount) {
        conditions.push(`amount >= $${paramCount}`);
        values.push(filters.min_amount);
        paramCount++;
      }

      if (filters.max_amount) {
        conditions.push(`amount <= $${paramCount}`);
        values.push(filters.max_amount);
        paramCount++;
      }

      if (filters.date_from) {
        conditions.push(`created_at >= $${paramCount}`);
        values.push(filters.date_from);
        paramCount++;
      }

      if (filters.date_to) {
        conditions.push(`created_at <= $${paramCount}`);
        values.push(filters.date_to);
        paramCount++;
      }

      const query = `
        SELECT COUNT(*) FROM transactions 
        WHERE ${conditions.join(' AND ')}
      `;

      const result = await pgPool.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error getting transaction count:', error);
      throw error;
    }
  }

  // Find all transactions with pagination
  static async findAll(page: number = 1, limit: number = 10): Promise<{ transactions: Transaction[]; total: number }> {
    try {
      // Get total count
      const countResult = await pgPool.query('SELECT COUNT(*) FROM transactions');
      const total = parseInt(countResult.rows[0].count);

      // Get transactions with pagination
      const offset = (page - 1) * limit;
      const query = `
        SELECT t.*, 
               u_buyer.email as buyer_email,
               u_seller.email as seller_email,
               ml.commodity_type,
               ml.volume
        FROM transactions t
        LEFT JOIN users u_buyer ON t.buyer_id = u_buyer.id
        LEFT JOIN users u_seller ON t.seller_id = u_seller.id
        LEFT JOIN mineral_listings ml ON t.listing_id = ml.id
        ORDER BY t.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await pgPool.query(query, [limit, offset]);

      return {
        transactions: result.rows,
        total
      };
    } catch (error) {
      console.error('Error finding all transactions:', error);
      throw error;
    }
  }

  // Get transaction statistics
  static async getStatistics(filters?: TransactionFilter): Promise<{
    total_transactions: number;
    total_amount: number;
    completed_transactions: number;
    completed_amount: number;
    pending_transactions: number;
    failed_transactions: number;
    average_transaction_amount: number;
  }> {
    try {
      const conditions: string[] = ['1=1'];
      const values: any[] = [];
      let paramCount = 1;

      // Apply filters if provided
      if (filters) {
        if (filters.buyer_id) {
          conditions.push(`buyer_id = $${paramCount}`);
          values.push(filters.buyer_id);
          paramCount++;
        }

        if (filters.seller_id) {
          conditions.push(`seller_id = $${paramCount}`);
          values.push(filters.seller_id);
          paramCount++;
        }

        if (filters.date_from) {
          conditions.push(`created_at >= $${paramCount}`);
          values.push(filters.date_from);
          paramCount++;
        }

        if (filters.date_to) {
          conditions.push(`created_at <= $${paramCount}`);
          values.push(filters.date_to);
          paramCount++;
        }
      }

      const query = `
        SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
          COALESCE(AVG(amount), 0) as average_transaction_amount
        FROM transactions 
        WHERE ${conditions.join(' AND ')}
      `;

      const result = await pgPool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting transaction statistics:', error);
      throw error;
    }
  }

  // Process refund
  static async processRefund(id: number, refundAmount: number, reason?: string): Promise<Transaction | null> {
    const client = await pgPool.connect();

    try {
      await client.query('BEGIN');

      const updateData: UpdateTransactionData = {
        refund_amount: refundAmount,
        refund_status: 'processing',
        metadata: { refund_reason: reason }
      };

      const result = await this.update(id, updateData);
      await client.query('COMMIT');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing refund:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Complete refund
  static async completeRefund(id: number): Promise<Transaction | null> {
    const client = await pgPool.connect();

    try {
      await client.query('BEGIN');

      const updateData: UpdateTransactionData = {
        status: 'refunded',
        refund_status: 'completed'
      };

      const result = await this.update(id, updateData);
      await client.query('COMMIT');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error completing refund:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default TransactionModel;

