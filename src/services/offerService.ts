// src/services/offerService.ts
import { pgPool as pool } from '../config/database.js';
import { ApplicationError } from '../utils/applicationError.js';

// Interface for an offer (matches database schema)
export interface Offer {
  id?: number;
  listing_id: number;
  buyer_id: number;
  offer_price: number;
  offer_quantity: number;
  message?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'expired' | 'completed';
  created_at?: string;
  updated_at?: string;
  currency: string; // Add currency to offer interface
}

export class OfferService {
  private pool = pool;

  // Create a new offer
  async createOffer(offerData: Offer): Promise<Offer> {
    const { listing_id, buyer_id, offer_price, offer_quantity, message, currency } = offerData;
    try {
      const result = await this.pool.query(
        `INSERT INTO mineral_offers (listing_id, buyer_id, offer_price, offer_quantity, message, currency)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [listing_id, buyer_id, offer_price, offer_quantity, message, currency]
      );
      return result.rows[0];
    } catch (error) {
      throw new ApplicationError('Failed to create offer.', 500, error as Error);
    }
  }

  // Get offers for a specific listing (for sellers)
  async getOffersByListing(listingId: number, sellerId: number): Promise<Offer[]> { // <-- Corrected signature: added sellerId
    try {
      const result = await this.pool.query(
        `SELECT mo.*, u.first_name, u.last_name, u.email
         FROM mineral_offers mo
         JOIN users u ON mo.buyer_id = u.id
         WHERE mo.listing_id = $1
         AND mo.listing_id IN (SELECT id FROM mineral_listings WHERE seller_id = $2) -- Ensure seller owns the listing
         ORDER BY mo.created_at DESC`,
        [listingId, sellerId] // Pass both arguments to the query
      );
      return result.rows;
    } catch (error) {
      console.error('Error in getOffersByListing:', error); // Added console log for debugging
      throw new ApplicationError('Failed to retrieve offers for listing.', 500, error as Error);
    }
  }

  // Get offers by buyer
  async getOffersByBuyer(buyerId: number): Promise<Offer[]> {
    try {
      const result = await this.pool.query(
        `SELECT mo.*, ml.mineral_type, ml.quantity as listing_quantity, ml.price_per_unit as listing_price_per_unit, ml.currency as listing_currency
         FROM mineral_offers mo
         JOIN mineral_listings ml ON mo.listing_id = ml.id
         WHERE mo.buyer_id = $1
         ORDER BY mo.created_at DESC`,
        [buyerId]
      );
      return result.rows;
    } catch (error) {
      throw new ApplicationError('Failed to retrieve offers made by buyer.', 500, error as Error);
    }
  }

  // Update offer status (for sellers)
  async updateOfferStatus(offerId: number, sellerId: number, status: 'accepted' | 'rejected' | 'expired' | 'completed'): Promise<Offer> {
    try {
      // Ensure the seller owns the listing associated with the offer
      const result = await this.pool.query(
        `UPDATE mineral_offers
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         AND listing_id IN (SELECT id FROM mineral_listings WHERE seller_id = $3)
         RETURNING *`,
        [status, offerId, sellerId]
      );

      if (result.rows.length === 0) {
        throw new ApplicationError('Offer not found or you do not have permission to update it.', 404);
      }
      return result.rows[0];
    } catch (error) {
      throw new ApplicationError('Failed to update offer status.', 500, error as Error);
    }
  }

  // Get a single offer by ID
  async getOfferById(offerId: number): Promise<Offer | null> {
    try {
      const result = await this.pool.query('SELECT * FROM mineral_offers WHERE id = $1', [offerId]);
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0];
    } catch (error) {
      throw new ApplicationError('Failed to retrieve offer by ID.', 500, error as Error);
    }
  }
}
