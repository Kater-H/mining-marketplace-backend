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

  // Get all mineral listings
  async getAllListings(): Promise<Listing[]> {
    try {
      const result = await this.pool.query('SELECT * FROM mineral_listings ORDER BY created_at DESC');
      return result.rows;
    } catch (error) {
      throw new ApplicationError('Failed to retrieve listings.', 500, error as Error);
    }
  }

  // Get a single mineral listing by ID
  async getListingById(id: number): Promise<Listing | null> {
    try {
      const result = await this.pool.query('SELECT * FROM mineral_listings WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0];
    } catch (error) {
      throw new ApplicationError('Failed to retrieve listing by ID.', 500, error as Error);
    }
  }

  // Update a mineral listing
  async updateListing(listingId: number, sellerId: number, updateData: Partial<Listing>): Promise<Listing> {
    console.log(`[ListingService] updateListing called with: listingId=${listingId}, sellerId=${sellerId}, updateData=`, updateData); // Debug log

    const fields = Object.keys(updateData)
      .map((key, index) => `${key} = $${index + 3}`) // $3, $4, ... for dynamic fields
      .join(', ');
    const values = Object.values(updateData);

    if (fields.length === 0) {
      throw new ApplicationError('No valid fields provided for update.', 400);
    }

    try {
      const result = await this.pool.query(
        `UPDATE mineral_listings
         SET ${fields}, last_updated = CURRENT_TIMESTAMP
         WHERE id = $1 AND seller_id = $2
         RETURNING *`,
        [listingId, sellerId, ...values] // $1 for listingId, $2 for sellerId, then dynamic values
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
      console.error("[ListingService] Error updating listing:", error); // Debug log
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
      throw new ApplicationError('Failed to retrieve listings by seller.', 500, error as Error);
    }
  }
}
