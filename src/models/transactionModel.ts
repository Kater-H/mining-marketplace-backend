import { Pool } from 'pg';
import { getPool } from '../config/database.js'; // ADDED .js

// Example model for transactions
export class TransactionModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  // Example method to get all transactions
  async getAllTransactions(): Promise<any[]> {
    const result = await this.pool.query('SELECT * FROM transactions');
    return result.rows;
  }

  // Add more methods for CRUD operations for transactions
}
