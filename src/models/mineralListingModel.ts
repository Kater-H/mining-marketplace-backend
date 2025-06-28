import { Pool } from 'pg';
import { getPool } from '../config/database.js'; // ADDED .js

// Example model for mineral listings
export class MineralListingModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  // Example method to get all listings
  async getAllListings(): Promise<any[]> {
    const result = await this.pool.query('SELECT * FROM mineral_listings');
    return result.rows;
  }

  // Add more methods for CRUD operations for mineral listings
}
