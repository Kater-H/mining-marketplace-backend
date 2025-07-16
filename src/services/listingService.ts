// src/services/listingService.ts
import { pgPool as pool } from '../config/database.js';
import { ApplicationError } from '../utils/applicationError.js';

// Interface for a mineral listing (matches database schema)
export interface Listing {
  id?: number;
  seller_id: number;
  mineral_type: string;
  description: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  currency: string;
  location: string;
  status?: 'available' | 'pending' | 'sold' | 'canceled';
  listed_date?: string;
  last_updated?: string;
  created_at?: string;
  updated_at?: string;
}

// Interface for listing filters
export interface ListingFilters {
  mineralType?: string;
  location?: string;
  status?: 'available' | 'pending' | 'sold' | 'canceled';
  minPrice?: number;
  maxPrice?: number;
}

export class ListingService {
  private pool = pool;

  // Create a new mineral listing
  async createListing(listingData: Listing): Promise<Listing> {
    const { seller_id, mineral_type, description, quantity, unit, price_per_unit, currency, location } = listingData;
    try {
      const result = await this.pool.query(
        `INSERT INTO mineral_listings (seller_id, mineral_type, description, quantity, unit, price_per_unit, currency, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [seller_id, mineral_type, description, quantity, unit, price_per_unit, currency, location]
      );
      return result.rows[0];
    } catch (error) {
      throw new ApplicationError('Failed to create listing.', 500, error as Error);
    }
  }

  // Get all mineral listings with optional filters
  async getAllListings(filters: ListingFilters): Promise<Listing[]> {
    let query = `SELECT * FROM mineral_listings WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.mineralType) {
      query += ` AND mineral_type ILIKE $${paramIndex++}`;
      params.push(`%${filters.mineralType}%`);
    }
    if (filters.location) {
      query += ` AND location ILIKE $${paramIndex++}`;
      params.push(`%${filters.location}%`);
    }
    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }
    if (filters.minPrice) {
      query += ` AND price_per_unit >= $${paramIndex++}`;
      params.push(filters.minPrice);
    }
    if (filters.maxPrice) {
      query += ` AND price_per_unit <= $${paramIndex++}`;
      params.push(filters.maxPrice);
    }

    query += ` ORDER BY created_at DESC`;

    try {
      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new ApplicationError('Failed to retrieve listings.', 500, error as Error);
    }
  }

  // Get a single mineral listing by ID
  async getListingById(listingId: number): Promise<Listing | null> {
    try {
      const result = await this.pool.query('SELECT * FROM mineral_listings WHERE id = $1', [listingId]);
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0];
    } catch (error) {
      throw new ApplicationError('Failed to retrieve listing details.', 500, error as Error);
    }
  }

  // Update a mineral listing
  async updateListing(listingId: number, sellerId: number, updateData: Partial<Listing>): Promise<Listing> {
    const { mineral_type, description, quantity, unit, price_per_unit, currency, location, status } = updateData;
    try {
      const result = await this.pool.query(
        `UPDATE mineral_listings
         SET mineral_type = COALESCE($1, mineral_type),
             description = COALESCE($2, description),
             quantity = COALESCE($3, quantity),
             unit = COALESCE($4, unit),
             price_per_unit = COALESCE($5, price_per_unit),
             currency = COALESCE($6, currency),
             location = COALESCE($7, location),
             status = COALESCE($8, status),
             last_updated = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $9 AND seller_id = $10
         RETURNING *`,
        [mineral_type, description, quantity, unit, price_per_unit, currency, location, status, listingId, sellerId]
      );

      if (result.rows.length === 0) {
        // Check if listing exists but seller_id doesn't match
        const existingListing = await this.getListingById(listingId);
        if (existingListing) {
          throw new ApplicationError('Forbidden: You do not have permission to update this listing.', 403);
        }
        throw new ApplicationError('Listing not found.', 404);
      }
      return result.rows[0];
    } catch (error) {
      throw new ApplicationError('Failed to update listing.', 500, error as Error);
    }
  }

  // Delete a mineral listing
  async deleteListing(listingId: number, sellerId: number): Promise<void> {
    try {
      const result = await this.pool.query(
        `DELETE FROM mineral_listings WHERE id = $1 AND seller_id = $2`,
        [listingId, sellerId]
      );
      if (result.rowCount === 0) {
        // Check if listing exists but seller_id doesn't match
        const existingListing = await this.getListingById(listingId);
        if (existingListing) {
          throw new ApplicationError('Forbidden: You do not have permission to delete this listing.', 403);
        }
        throw new ApplicationError('Listing not found.', 404);
      }
    } catch (error) {
      throw new ApplicationError('Failed to delete listing.', 500, error as Error);
    }
  }

  // Get listings by seller ID
  async getListingsBySeller(sellerId: number): Promise<Listing[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM mineral_listings WHERE seller_id = $1 ORDER BY created_at DESC`,
        [sellerId]
      );
      return result.rows;
    } catch (error) {
      throw new ApplicationError('Failed to retrieve seller listings.', 500, error as Error);
    }
  }
}
