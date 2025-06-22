// Marketplace interfaces for mineral listings and transactions

/**
 * Interface for mineral listing data
 */
export interface MineralListingData {
  user_id: number;
  commodity_type: string;
  volume: number;
  grade: string;
  origin_location: string;
  price_per_unit: number;
  currency: string;
  available: boolean;
  description?: string;
  images?: string[];
}

/**
 * Interface for compliance data
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
 */
export interface MineralListingFilter {
  commodity_type?: string;
  min_price?: number;
  max_price?: number;
  min_volume?: number;
  max_volume?: number;
  origin_location?: string;
  min_compliance_score?: number;
  available_only?: boolean;
  verified_only?: boolean;
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
  volume: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  message?: string;
  expiry_date?: Date;
}
