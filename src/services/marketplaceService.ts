import { Pool } from 'pg'; // External module, no .js
import { getPool } from '../config/database.js'; // Ensure .js is here
import {
  MineralListingData,
  ComplianceData,
  MineralListingFilter,
  MineralOffer
} from '../models/interfaces/marketplace.js'; // Ensure .js is here

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
      // CHANGED: Column names and corresponding data access to match mineral_listings schema
      // Removed 'grade' and 'available' as they are not in the current schema
      const insertListingQuery = `
        INSERT INTO mineral_listings (
          seller_id, mineral_type, quantity,
          location, price_per_unit, currency,
          description, status, unit
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;
      `;

      const listingResult = await client.query(insertListingQuery, [
        listingData.seller_id, // Corrected from user_id
        listingData.mineralType, // Corrected from commodity_type (and matches incoming camelCase)
        listingData.quantity, // Corrected from volume (and matches incoming camelCase)
        listingData.location, // Corrected from origin_location (and matches incoming camelCase)
        listingData.pricePerUnit, // Corrected from price_per_unit (and matches incoming camelCase)
        listingData.currency || 'USD',
        listingData.description || null,
        listingData.status || 'available', // Default status, allowing override from input
        listingData.unit // Added unit as it's a NOT NULL column
      ]);

      const listingId = listingResult.rows[0].id;

      // Insert compliance data if provided (skip for now as we don't have compliance table)
      // if (complianceData) {
      //    // Compliance data insertion would go here
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
      if (filters?.mineral_type) { // CHANGED: filter by mineral_type
        query += ` AND mineral_type = $${paramIndex++}`;
        queryParams.push(filters.mineral_type);
      }

      if (filters?.location) { // CHANGED: filter by location
        query += ` AND location ILIKE $${paramIndex++}`;
        queryParams.push(`%${filters.location}%`);
      }

      if (filters?.min_price) {
        query += ` AND price_per_unit >= $${paramIndex++}`;
        queryParams.push(filters.min_price);
      }

      if (filters?.max_price) {
        query += ` AND price_per_unit <= $${paramIndex++}`;
        queryParams.push(filters.max_price);
      }

      if (filters?.status) { // CHANGED: filter by status
        query += ` AND status = $${paramIndex++}`;
        queryParams.push(filters.status);
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

      // CHANGED: Check against existingListing.seller_id
      if (existingListing.seller_id !== userId) {
        throw new Error('Unauthorized: You can only update your own listings');
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (updateData.mineralType) { // CHANGED: from commodity_type
        updateFields.push(`mineral_type = $${paramIndex++}`);
        queryParams.push(updateData.mineralType);
      }

      if (updateData.quantity !== undefined) { // CHANGED: from volume
        updateFields.push(`quantity = $${paramIndex++}`);
        queryParams.push(updateData.quantity);
      }

      if (updateData.pricePerUnit !== undefined) { // CHANGED: from price_per_unit
        updateFields.push(`price_per_unit = $${paramIndex++}`);
        queryParams.push(updateData.pricePerUnit);
      }

      if (updateData.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        queryParams.push(updateData.description);
      }

      if (updateData.status !== undefined) { // CHANGED: from available
        updateFields.push(`status = $${paramIndex++}`);
        queryParams.push(updateData.status);
      }

      if (updateData.unit !== undefined) { // ADDED: unit update
        updateFields.push(`unit = $${paramIndex++}`);
        queryParams.push(updateData.unit);
      }

      if (updateData.location !== undefined) { // CHANGED: from origin_location
        updateFields.push(`location = $${paramIndex++}`);
        queryParams.push(updateData.location);
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

      // CHANGED: Check against existingListing.seller_id
      if (existingListing.seller_id !== userId) {
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
          listing_id, buyer_id, offer_price, currency, offer_quantity, status, message, expiry_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id;
      `;

      const result = await this.pool.query(insertOfferQuery, [
        offerData.listing_id,
        offerData.buyer_id,
        offerData.offer_price,
        offerData.currency,
        offerData.offer_quantity, // Corrected from volume
        offerData.status || 'pending',
        offerData.message || null, // Added null for optional message
        offerData.expiry_date || null // Added null for optional expiry_date
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
        SELECT mo.*, ml.mineral_type, ml.quantity as listing_quantity, ml.price_per_unit as listing_price_per_unit
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
