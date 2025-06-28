import { Pool } from 'pg';
import { getPool } from '../config/database.js'; // Ensure .js is here

// Example model for users
export class UserModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  // Example method to get all users
  async getAllUsers(): Promise<any[]> {
    const result = await this.pool.query('SELECT * FROM users');
    return result.rows;
  }

  // Add more methods for CRUD operations for users
}
