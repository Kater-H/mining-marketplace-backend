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
        `INSERT INTO offers (listing_id, buyer_id, offer_price, offer_quantity, message, currency)
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
  async getOffersByListing(listingId: number, sellerId: number): Promise<Offer[]> {
    try {
      // Join with mineral_listings to ensure the seller owns the listing
      const result = await this.pool.query(
        `SELECT o.*, u.first_name as buyer_first_name, u.last_name as buyer_last_name
         FROM offers o
         JOIN mineral_listings ml ON o.listing_id = ml.id
         JOIN users u ON o.buyer_id = u.id
         WHERE o.listing_id = $1 AND ml.seller_id = $2
         ORDER BY o.created_at DESC`,
        [listingId, sellerId]
      );
      return result.rows;
    } catch (error) {
      throw new ApplicationError('Failed to retrieve offers for listing.', 500, error as Error);
    }
  }

  // Get offers made by a specific buyer
  async getOffersByBuyer(buyerId: number): Promise<Offer[]> {
    try {
      // Join with mineral_listings to get mineral type and location for display
      const result = await this.pool.query(
        `SELECT o.*, ml.mineral_type as listing_mineral_type, ml.location as listing_location,
                ml.price_per_unit as listing_price_per_unit, ml.quantity as listing_quantity, ml.currency as listing_currency
         FROM offers o
         JOIN mineral_listings ml ON o.listing_id = ml.id
         WHERE o.buyer_id = $1
         ORDER BY o.created_at DESC`,
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
        `UPDATE offers
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
      const result = await this.pool.query('SELECT * FROM offers WHERE id = $1', [offerId]);
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0];
    } catch (error) {
      throw new ApplicationError('Failed to retrieve offer details.', 500, error as Error);
    }
  }
}
