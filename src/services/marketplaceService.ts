// First, let me complete the MarketplaceService implementation with additional methods
import { Pool } from 'pg';
import { getPool } from '../config/database';
import {
  MineralListingData,
  ComplianceData,
  MineralListingFilter,
  MineralOffer
} from '../models/interfaces/marketplace';

// Marketplace service class
export class MarketplaceService {
  private pool: Pool;

  constructor(marketplaceModel?: any) {
    // Use provided pool (for testing) or get the appropriate pool
    this.pool = marketplaceModel?.pool || getPool();
  }

  // Create a new mineral listing
  async createMineralListing(
    listingData: MineralListingData,
    complianceData?: ComplianceData
  ): Promise<{ listing_id: number }> {
    const client = await this.pool.connect();

    try {
      // Begin transaction
      await client.query('BEGIN');

      // Insert mineral listing - using actual database columns
      const insertListingQuery = `
        INSERT INTO mineral_listings (
          user_id, commodity_type, volume, grade,
          origin_location, price_per_unit, currency, 
          available, description, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id;
      `;

      const listingResult = await client.query(insertListingQuery, [
        listingData.user_id,
        listingData.commodity_type,
        listingData.volume,
        listingData.grade || null,
        listingData.origin_location,
        listingData.price_per_unit,
        listingData.currency || 'USD',
        listingData.available !== false, // Default to true
        listingData.description || null,
        'active' // Default status
      ]);

      const listingId = listingResult.rows[0].id;

      // Insert compliance data if provided (skip for now as we don't have compliance table)
      // if (complianceData) {
      //   // Compliance data insertion would go here
      // }

      // Commit transaction
      await client.query('COMMIT');

      return { listing_id: listingId };
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      console.error('Error creating mineral listing:', error);
      throw error;
    } finally {
      // Release client
      client.release();
    }
  }

  // Get mineral listings with optional filters
  async getMineralListings(filters?: MineralListingFilter): Promise<any[]> {
    try {
      let query = `
        SELECT * FROM mineral_listings
        WHERE 1=1
      `;
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Apply filters
      if (filters?.commodity_type) {
        query += ` AND commodity_type = $${paramIndex++}`;
        queryParams.push(filters.commodity_type);
      }

      if (filters?.origin_location) {
        query += ` AND origin_location ILIKE $${paramIndex++}`;
        queryParams.push(`%${filters.origin_location}%`);
      }

      if (filters?.min_price) {
        query += ` AND price_per_unit >= $${paramIndex++}`;
        queryParams.push(filters.min_price);
      }

      if (filters?.max_price) {
        query += ` AND price_per_unit <= $${paramIndex++}`;
        queryParams.push(filters.max_price);
      }

      if (filters?.available_only) {
        query += ` AND available = true`;
      }

      // Add sorting
      const sortBy = filters?.sort_by || 'created_at';
      const sortDirection = filters?.sort_direction || 'desc';
      query += ` ORDER BY ${sortBy} ${sortDirection}`;

      // Add pagination
      if (filters?.limit) {
        query += ` LIMIT $${paramIndex++}`;
        queryParams.push(filters.limit);
      }

      if (filters?.page && filters?.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query += ` OFFSET $${paramIndex++}`;
        queryParams.push(offset);
      }

      const result = await this.pool.query(query, queryParams);
      return result.rows;
    } catch (error) {
      console.error('Error getting mineral listings:', error);
      throw error;
    }
  }

  // Get a specific mineral listing by ID
  async getMineralListingById(listingId: number): Promise<any | null> {
    try {
      const query = `
        SELECT * FROM mineral_listings
        WHERE id = $1
      `;

      const result = await this.pool.query(query, [listingId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting mineral listing by ID:', error);
      throw error;
    }
  }

  // Update a mineral listing
  async updateMineralListing(listingId: number, updateData: Partial<MineralListingData>, userId: number): Promise<any> {
    try {
      // Check if listing exists and user owns it
      const existingListing = await this.getMineralListingById(listingId);
      if (!existingListing) {
        throw new Error('Listing not found');
      }

      if (existingListing.user_id !== userId) {
        throw new Error('Unauthorized: You can only update your own listings');
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (updateData.commodity_type) {
        updateFields.push(`commodity_type = $${paramIndex++}`);
        queryParams.push(updateData.commodity_type);
      }

      if (updateData.volume !== undefined) {
        updateFields.push(`volume = $${paramIndex++}`);
        queryParams.push(updateData.volume);
      }

      if (updateData.price_per_unit !== undefined) {
        updateFields.push(`price_per_unit = $${paramIndex++}`);
        queryParams.push(updateData.price_per_unit);
      }

      if (updateData.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        queryParams.push(updateData.description);
      }

      if (updateData.available !== undefined) {
        updateFields.push(`available = $${paramIndex++}`);
        queryParams.push(updateData.available);
      }

      if (updateData.grade !== undefined) {
        updateFields.push(`grade = $${paramIndex++}`);
        queryParams.push(updateData.grade);
      }

      if (updateData.origin_location !== undefined) {
        updateFields.push(`origin_location = $${paramIndex++}`);
        queryParams.push(updateData.origin_location);
      }

      if (updateFields.length === 0) {
        return { message: 'No fields to update' };
      }

      // Add updated_at timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE mineral_listings 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++}
        RETURNING *
      `;
      queryParams.push(listingId);

      const result = await this.pool.query(query, queryParams);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating mineral listing:', error);
      throw error;
    }
  }

  // Delete a mineral listing
  async deleteMineralListing(listingId: number, userId: number): Promise<boolean> {
    try {
      // Check if listing exists and user owns it
      const existingListing = await this.getMineralListingById(listingId);
      if (!existingListing) {
        throw new Error('Listing not found');
      }

      if (existingListing.user_id !== userId) {
        throw new Error('Unauthorized: You can only delete your own listings');
      }

      // Delete the listing
      const result = await this.pool.query('DELETE FROM mineral_listings WHERE id = $1', [listingId]);

      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting mineral listing:', error);
      throw error;
    }
  }

  // Create a mineral offer
  async createMineralOffer(offerData: MineralOffer): Promise<{ offer_id: number }> {
    try {
      // Check if listing exists
      const listing = await this.getMineralListingById(offerData.listing_id);
      if (!listing) {
        throw new Error('Listing not found');
      }

      const insertOfferQuery = `
        INSERT INTO mineral_offers (
          listing_id, buyer_id, offer_price, currency, volume, status, message, expiry_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id;
      `;

      const result = await this.pool.query(insertOfferQuery, [
        offerData.listing_id,
        offerData.buyer_id,
        offerData.offer_price,
        offerData.currency,
        offerData.volume,
        offerData.status || 'pending',
        offerData.message,
        offerData.expiry_date
      ]);

      return { offer_id: result.rows[0].id };
    } catch (error) {
      console.error('Error creating mineral offer:', error);
      throw error;
    }
  }

  // Update offer status
  async updateOfferStatus(offerId: number, status: string): Promise<any> {
    try {
      const query = `
        UPDATE mineral_offers 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const result = await this.pool.query(query, [status, offerId]);
      
      if (result.rows.length === 0) {
        throw new Error('Offer not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating offer status:', error);
      throw error;
    }
  }

  // Get offers for a specific listing
  async getOffersForListing(listingId: number): Promise<any[]> {
    try {
      const query = `
        SELECT mo.*, u.first_name, u.last_name, u.email
        FROM mineral_offers mo
        JOIN users u ON mo.buyer_id = u.id
        WHERE mo.listing_id = $1
        ORDER BY mo.created_at DESC
      `;

      const result = await this.pool.query(query, [listingId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting offers for listing:', error);
      throw error;
    }
  }

  // Get offers by buyer
  async getOffersByBuyer(buyerId: number): Promise<any[]> {
    try {
      const query = `
        SELECT mo.*, ml.commodity_type, ml.volume as listing_volume, ml.price as listing_price
        FROM mineral_offers mo
        JOIN mineral_listings ml ON mo.listing_id = ml.id
        WHERE mo.buyer_id = $1
        ORDER BY mo.created_at DESC
      `;

      const result = await this.pool.query(query, [buyerId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting offers by buyer:', error);
      throw error;
    }
  }
}

