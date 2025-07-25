// src/models/listingModel.ts
import { Pool } from 'pg';
import { getPool } from '../config/database.js'; // Ensure .js is here

// Define the BackendListing interface here as the source of truth
// It includes columns from 'listings' table and joined columns from 'users' table
export interface BackendListing {
  id: number;
  seller_id: number;
  mineral_type: string;
  description: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  currency: string;
  location: string;
  status: 'available' | 'pending' | 'sold' | 'canceled';
  created_at: Date; // Ensure this is a Date object from DB
  updated_at: Date; // Ensure this is a Date object from DB
  // Joined seller details (from users table)
  seller_company_name?: string;
  seller_location?: string;
  seller_compliance_status?: 'pending' | 'compliant' | 'non_compliant';
}

// Interface for creating a new listing (input data)
export interface CreateListingInput {
  seller_id: number;
  mineral_type: string;
  description: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  currency: string;
  location: string;
  status?: 'available' | 'pending' | 'sold' | 'canceled';
}

// Interface for updating an existing listing (partial input data)
export interface UpdateListingInput {
  mineral_type?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  price_per_unit?: number;
  currency?: string;
  location?: string;
  status?: 'available' | 'pending' | 'sold' | 'canceled';
}


export class ListingModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Creates a new listing in the database.
   * @param listingData - The data for the new listing.
   * @returns The newly created listing.
   */
  async createListing(listingData: CreateListingInput): Promise<BackendListing> {
    const { seller_id, mineral_type, description, quantity, unit, price_per_unit, currency, location, status } = listingData;
    const result = await this.pool.query(
      `INSERT INTO listings (
        seller_id, mineral_type, description, quantity, unit, price_per_unit, currency, location, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *`,
      [seller_id, mineral_type, description, quantity, unit, price_per_unit, currency, location, status || 'available']
    );
    return result.rows[0];
  }

  /**
   * Fetches a single listing by ID without joining seller details.
   * Used for internal checks like ownership.
   * @param id - The listing ID.
   * @returns The listing if found, otherwise null.
   */
  async getListingById(id: number): Promise<BackendListing | null> {
    const result = await this.pool.query('SELECT * FROM listings WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Fetches all listings with joined seller details.
   * @returns An array of listings with seller information.
   */
  async getAllListingsWithSellerDetails(): Promise<BackendListing[]> {
    const result = await this.pool.query(`
      SELECT
        l.*,
        u.company_name AS seller_company_name,
        u.location AS seller_location,
        u.compliance_status AS seller_compliance_status
      FROM listings l
      JOIN users u ON l.seller_id = u.id
      ORDER BY l.created_at DESC
    `);
    return result.rows;
  }

  /**
   * Fetches a single listing by ID with joined seller details.
   * @param id - The listing ID.
   * @returns The listing with seller information if found, otherwise null.
   */
  async getListingByIdWithSellerDetails(id: number): Promise<BackendListing | null> {
    const result = await this.pool.query(`
      SELECT
        l.*,
        u.company_name AS seller_company_name,
        u.location AS seller_location,
        u.compliance_status AS seller_compliance_status
      FROM listings l
      JOIN users u ON l.seller_id = u.id
      WHERE l.id = $1
    `, [id]);
    return result.rows[0] || null;
  }

  /**
   * Fetches all listings by a specific seller ID with seller details.
   * @param sellerId - The ID of the seller.
   * @returns An array of listings by the specified seller.
   */
  async getListingsBySellerId(sellerId: number): Promise<BackendListing[]> {
    const result = await this.pool.query(`
      SELECT
        l.*,
        u.company_name AS seller_company_name,
        u.location AS seller_location,
        u.compliance_status AS seller_compliance_status
      FROM listings l
      JOIN users u ON l.seller_id = u.id
      WHERE l.seller_id = $1
      ORDER BY l.created_at DESC
    `, [sellerId]);
    return result.rows;
  }

  /**
   * Updates an existing listing in the database.
   * @param id - The ID of the listing to update.
   * @param updates - An object containing the fields to update.
   * @returns The updated listing.
   */
  async updateListing(id: number, updates: UpdateListingInput): Promise<BackendListing> {
    const fields = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    const values = Object.values(updates);

    if (values.length === 0) {
      const listing = await this.getListingById(id); // If no updates, just return current listing
      if (!listing) throw new Error('Listing not found');
      return listing;
    }

    const result = await this.pool.query(
      `UPDATE listings SET ${fields}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  }

  /**
   * Deletes a listing from the database.
   * @param id - The ID of the listing to delete.
   */
  async deleteListing(id: number): Promise<void> {
    await this.pool.query('DELETE FROM listings WHERE id = $1', [id]);
  }
}
