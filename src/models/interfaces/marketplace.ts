// Marketplace interfaces for mineral listings and transactions

/**
 * Interface for mineral listing data
 * This interface reflects the data structure as it comes from the request body (camelCase)
 * and maps to the database columns (snake_case where appropriate).
 */
export interface MineralListingData {
  seller_id: number; // Changed from user_id to match DB column and controller
  mineralType: string; // Changed from commodity_type to match incoming JSON
  quantity: number; // Changed from volume to match incoming JSON
  unit: string; // Added to match DB column (NOT NULL)
  location: string; // Changed from origin_location to match incoming JSON
  pricePerUnit: number; // Changed from price_per_unit to match incoming JSON
  currency: string;
  status: 'available' | 'pending' | 'sold' | 'canceled'; // Changed from 'available' boolean to 'status' string
  description?: string;
  images?: string[];
  // Removed 'grade' and 'available' as they are not in the current mineral_listings table schema.
  // If you add them to the DB, uncomment/add them here.
  // grade?: string;
  // available?: boolean;
}

/**
 * Interface for compliance data
 * (No changes needed based on current errors, but keeping for completeness)
 */
export interface ComplianceData {
  certification_type: string;
  certification_id: string;
  certification_date: Date;
  expiry_date?: Date;
  compliance_score?: number;
  verified_by?: string;
}

/**
 * Interface for mineral listing filters
 * These reflect the query parameters and database column names for filtering.
 */
export interface MineralListingFilter {
  mineral_type?: string; // Changed from commodity_type to match DB column
  min_price?: number;
  max_price?: number;
  min_quantity?: number; // Changed from min_volume
  max_quantity?: number; // Changed from max_volume
  location?: string; // Changed from origin_location to match DB column
  min_compliance_score?: number;
  status?: 'available' | 'pending' | 'sold' | 'canceled'; // Added status filter
  // Removed 'available_only' as 'status' is now used
  // verified_only?: boolean; // Keep if you have a 'verified' column or logic
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Interface for mineral offers
 */
export interface MineralOffer {
  listing_id: number;
  buyer_id: number;
  offer_price: number;
  currency: string;
  offer_quantity: number; // Changed from volume to match DB column
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  message?: string;
  expiry_date?: Date;
}

/**
 * Interface for Transaction data
 * Reflects the 'transactions' table schema.
 */
export interface Transaction {
  id?: number; // Optional as it's SERIAL PRIMARY KEY
  listing_id: number;
  buyer_id: number;
  seller_id: number;
  offer_id?: number | null; // Optional, can be null if no offer was involved
  final_price: number;
  final_quantity: number;
  currency: string;
  transaction_date?: Date; // Optional, defaults to CURRENT_TIMESTAMP
  status?: 'completed' | 'pending' | 'failed' | 'refunded'; // Default 'completed'
  payment_gateway_id?: string | null; // Optional, can be null
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Interface for Webhook Event data
 * Reflects the 'webhook_events' table schema.
 */
export interface WebhookEvent {
  id?: number; // Optional as it's SERIAL PRIMARY KEY
  event_id: string; // Unique ID from the webhook provider
  event_type: string; // e.g., 'charge.succeeded', 'payment.failed'
  payload: any; // Store the full JSON payload (JSONB in DB)
  processed?: boolean; // Default FALSE
  created_at?: Date;
}
