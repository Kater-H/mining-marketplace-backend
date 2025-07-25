import { Pool } from 'pg';
import { getPool } from '../config/database.js';
import {
  MineralListingData,
  ComplianceData,
  MineralListingFilter,
  MineralOffer,
  Transaction, // Added for completeness
  WebhookEvent // Added for completeness
} from '../models/interfaces/marketplace.js'; // Import new interfaces
import { config } from '../config/config.js'; // Import config for secret keys

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
    const client = await this.pool.connect(); // Client acquired
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
      await client.query('ROLLBACK');
      console.error('Error creating mineral listing:', error);
      throw error;
    } finally {
      client.release(); // Client released
    }
  }

  // Get mineral listings with optional filters
  async getMineralListings(filters?: MineralListingFilter): Promise<any[]> {
    const client = await this.pool.connect(); // Client acquired
    try {
      // CHANGED: Explicitly select columns instead of SELECT *
      let query = `
        SELECT
          id, seller_id, mineral_type, description, quantity, unit,
          price_per_unit, currency, location, status,
          listed_date, last_updated, created_at, updated_at
        FROM mineral_listings
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

      // --- NEW DEBUG LOGS ---
      console.log('🔍 Service: Executing query for getMineralListings:', query);
      console.log('🔍 Service: Query parameters for getMineralListings:', queryParams);
      // --- END NEW DEBUG LOGS ---

      const result = await client.query(query, queryParams); // Used client

      // --- NEW DEBUG LOGS ---
      console.log('✅ Service: Query successful for getMineralListings. Rows returned:', result.rows.length);
      if (result.rows.length > 0) {
        console.log('✅ Service: First row data from getMineralListings:', JSON.stringify(result.rows[0], null, 2));
      }
      // --- END NEW DEBUG LOGS ---

      return result.rows;
    } catch (error) {
      console.error('❌ Service: Error getting mineral listings:', error);
      throw error;
    } finally {
      client.release(); // Client released
    }
  }

  // Get a specific mineral listing by ID
  async getMineralListingById(listingId: number): Promise<any | null> {
    const client = await this.pool.connect(); // Client acquired
    try {
      const query = `
        SELECT * FROM mineral_listings
        WHERE id = $1
      `;

      const result = await client.query(query, [listingId]); // Used client
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting mineral listing by ID:', error);
      throw error;
    } finally {
      client.release(); // Client released
    }
  }

  // Update a mineral listing
  // Added userRoles parameter to allow admin override
  async updateMineralListing(listingId: number, updateData: Partial<MineralListingData>, userId: number, userRoles: string[]): Promise<any> {
    const client = await this.pool.connect(); // Client acquired
    try {
      // Check if listing exists
      const existingListing = await this.getMineralListingById(listingId);
      if (!existingListing) {
        throw new Error('Listing not found');
      }

      // Authorization check: User must be the seller OR an admin
      const isOwner = existingListing.seller_id === userId;
      const isAdmin = userRoles.includes('admin');

      if (!isOwner && !isAdmin) { // <-- Combined check
        throw new Error('Unauthorized: You can only update your own listings or as an admin');
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

      const result = await client.query(query, queryParams);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating mineral listing:', error);
      throw error;
    } finally {
      client.release(); // Client released
    }
  }

  // Delete a mineral listing
  // Added userRoles parameter to allow admin override
  async deleteMineralListing(listingId: number, userId: number, userRoles: string[]): Promise<boolean> {
    const client = await this.pool.connect(); // Client acquired
    try {
      // Check if listing exists
      const existingListing = await this.getMineralListingById(listingId);
      if (!existingListing) {
        throw new Error('Listing not found');
      }

      // Authorization check: User must be the seller OR an admin
      const isOwner = existingListing.seller_id === userId;
      const isAdmin = userRoles.includes('admin');

      if (!isOwner && !isAdmin) { // <-- Combined check
        throw new Error('Unauthorized: You can only delete your own listings or as an admin');
      }

      // Delete the listing
      const result = await client.query('DELETE FROM mineral_listings WHERE id = $1', [listingId]); // Used client

      return result.rowCount > 0;
    } catch (error: any) { // Explicitly type error as 'any' to access 'code'
      console.error('Error deleting mineral listing:', error);
      // Handle specific foreign key constraint error more gracefully by throwing a specific error
      if (error.code === '23503') {
        // Throw a custom error or a more descriptive standard Error
        throw new Error('FOREIGN_KEY_VIOLATION: Cannot delete listing due to existing related transactions or offers.');
      } else {
        throw error; // Re-throw other errors
      }
    } finally {
      client.release(); // Client released
    }
  }

  // Create a mineral offer
  async createMineralOffer(offerData: MineralOffer): Promise<{ offer_id: number }> {
    const client = await this.pool.connect(); // Client acquired
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

      const result = await client.query(insertOfferQuery, [ // Used client
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
    } finally {
      client.release(); // Client released
    }
  }

  // ADDED: Get a specific mineral offer by ID
  async getOfferById(offerId: number): Promise<MineralOffer | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM mineral_offers
        WHERE id = $1
      `;
      const result = await client.query(query, [offerId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting offer by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update offer status
  async updateOfferStatus(offerId: number, status: string): Promise<any> {
    const client = await this.pool.connect(); // Client acquired
    try {
      const query = `
        UPDATE mineral_offers
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const result = await client.query(query, [status, offerId]); // Used client

      if (result.rows.length === 0) {
        throw new Error('Offer not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating offer status:', error);
      throw error;
    } finally {
      client.release(); // Client released
    }
  }

  // Get offers for a specific listing
  async getOffersForListing(listingId: number): Promise<any[]> {
    const client = await this.pool.connect(); // Client acquired
    try {
      const query = `
        SELECT mo.*, u.first_name, u.last_name, u.email
        FROM mineral_offers mo
        JOIN users u ON mo.buyer_id = u.id
        WHERE mo.listing_id = $1
        ORDER BY mo.created_at DESC
      `;

      const result = await client.query(query, [listingId]); // Used client
      return result.rows;
    } catch (error) {
      console.error('Error getting offers for listing:', error);
      throw error;
    } finally {
      client.release(); // Client released
    }
  }

  // Get offers by buyer
  async getOffersByBuyer(buyerId: number): Promise<any[]> {
    const client = await this.pool.connect(); // Client acquired
    try {
      const query = `
        SELECT mo.*, ml.mineral_type, ml.quantity as listing_quantity, ml.price_per_unit as listing_price_per_unit
        FROM mineral_offers mo
        JOIN mineral_listings ml ON mo.listing_id = ml.id
        WHERE mo.buyer_id = $1
        ORDER BY mo.created_at DESC
      `;

      const result = await client.query(query, [buyerId]); // Used client
      return result.rows;
    } catch (error) {
      console.error('Error getting offers by buyer:', error);
      throw error;
    } finally {
      client.release(); // Client released
    }
  }
}
