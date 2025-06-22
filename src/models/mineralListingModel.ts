import { pgPool } from '../config/database';
import { QueryResult } from 'pg';

// Mineral listing interface
export interface MineralListing {
  id: number;
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
  created_at: Date;
  updated_at: Date;
  status: 'active' | 'inactive' | 'sold' | 'pending';
  compliance_score?: number;
  verified: boolean;
  verification_date?: Date;
  verified_by?: string;
}

// Mineral listing creation data interface
export interface CreateMineralListingData {
  user_id: number;
  commodity_type: string;
  volume: number;
  grade: string;
  origin_location: string;
  price_per_unit: number;
  currency: string;
  available?: boolean;
  description?: string;
  images?: string[];
  status?: 'active' | 'inactive' | 'sold' | 'pending';
}

// Mineral listing update data interface
export interface UpdateMineralListingData {
  commodity_type?: string;
  volume?: number;
  grade?: string;
  origin_location?: string;
  price_per_unit?: number;
  currency?: string;
  available?: boolean;
  description?: string;
  images?: string[];
  status?: 'active' | 'inactive' | 'sold' | 'pending';
  compliance_score?: number;
  verified?: boolean;
  verification_date?: Date;
  verified_by?: string;
}

// Mineral listing filter interface
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
  user_id?: number;
  status?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Compliance data interface
export interface ComplianceData {
  listing_id: number;
  certification_type: string;
  certification_id: string;
  certification_date: Date;
  expiry_date?: Date;
  compliance_score?: number;
  verified_by?: string;
  created_at: Date;
  updated_at: Date;
}

// MineralListingModel class with CRUD operations
export class MineralListingModel {
  /**
   * Find mineral listing by ID
   */
  static async findById(id: number): Promise<MineralListing | null> {
    try {
      const query = 'SELECT * FROM mineral_listings WHERE id = $1';
      const result: QueryResult = await pgPool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as MineralListing;
    } catch (error) {
      console.error('Error finding mineral listing by ID:', error);
      throw error;
    }
  }

  /**
   * Find mineral listings by user ID
   */
  static async findByUserId(userId: number): Promise<MineralListing[]> {
    try {
      const query = 'SELECT * FROM mineral_listings WHERE user_id = $1 ORDER BY created_at DESC';
      const result: QueryResult = await pgPool.query(query, [userId]);
      
      return result.rows as MineralListing[];
    } catch (error) {
      console.error('Error finding mineral listings by user ID:', error);
      throw error;
    }
  }

  /**
   * Create a new mineral listing
   */
  static async create(listingData: CreateMineralListingData): Promise<MineralListing> {
    const client = await pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO mineral_listings (
          user_id, commodity_type, volume, grade, origin_location, 
          price_per_unit, currency, available, description, images, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        listingData.user_id,
        listingData.commodity_type,
        listingData.volume,
        listingData.grade,
        listingData.origin_location,
        listingData.price_per_unit,
        listingData.currency,
        listingData.available ?? true,
        listingData.description || null,
        listingData.images || null,
        listingData.status || 'active'
      ];
      
      const result: QueryResult = await client.query(query, values);
      
      await client.query('COMMIT');
      
      return result.rows[0] as MineralListing;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating mineral listing:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update mineral listing by ID
   */
  static async update(id: number, listingData: UpdateMineralListingData): Promise<MineralListing | null> {
    const client = await pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      Object.entries(listingData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });
      
      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('No fields to update');
      }
      
      // Add updated_at timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      const query = `
        UPDATE mineral_listings 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      values.push(id);
      
      const result: QueryResult = await client.query(query, values);
      
      await client.query('COMMIT');
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as MineralListing;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating mineral listing:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete mineral listing by ID
   */
  static async delete(id: number): Promise<boolean> {
    const client = await pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = 'DELETE FROM mineral_listings WHERE id = $1';
      const result: QueryResult = await client.query(query, [id]);
      
      await client.query('COMMIT');
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting mineral listing:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add photo to mineral listing
   */
  static async addPhoto(id: number, photoUrl: string): Promise<MineralListing | null> {
    const client = await pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        UPDATE mineral_listings 
        SET images = COALESCE(images, '{}') || $1::text[], updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const result: QueryResult = await client.query(query, [[photoUrl], id]);
      
      await client.query('COMMIT');
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as MineralListing;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding photo to mineral listing:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete photo from mineral listing
   */
  static async deletePhoto(id: number, photoUrl: string): Promise<MineralListing | null> {
    const client = await pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        UPDATE mineral_listings 
        SET images = array_remove(COALESCE(images, '{}'), $1), updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const result: QueryResult = await client.query(query, [photoUrl, id]);
      
      await client.query('COMMIT');
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as MineralListing;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting photo from mineral listing:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update listing status
   */
  static async updateStatus(id: number, status: 'active' | 'inactive' | 'sold' | 'pending'): Promise<MineralListing | null> {
    const client = await pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        UPDATE mineral_listings 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const result: QueryResult = await client.query(query, [status, id]);
      
      await client.query('COMMIT');
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as MineralListing;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating listing status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find listings with filters and pagination
   */
  static async findWithFilters(filters: MineralListingFilter): Promise<MineralListing[]> {
    try {
      let query = 'SELECT * FROM mineral_listings WHERE 1=1';
      const values: any[] = [];
      let paramCount = 1;

      // Apply filters
      if (filters.commodity_type) {
        query += ` AND commodity_type = $${paramCount}`;
        values.push(filters.commodity_type);
        paramCount++;
      }

      if (filters.min_price !== undefined) {
        query += ` AND price_per_unit >= $${paramCount}`;
        values.push(filters.min_price);
        paramCount++;
      }

      if (filters.max_price !== undefined) {
        query += ` AND price_per_unit <= $${paramCount}`;
        values.push(filters.max_price);
        paramCount++;
      }

      if (filters.min_volume !== undefined) {
        query += ` AND volume >= $${paramCount}`;
        values.push(filters.min_volume);
        paramCount++;
      }

      if (filters.max_volume !== undefined) {
        query += ` AND volume <= $${paramCount}`;
        values.push(filters.max_volume);
        paramCount++;
      }

      if (filters.origin_location) {
        query += ` AND origin_location ILIKE $${paramCount}`;
        values.push(`%${filters.origin_location}%`);
        paramCount++;
      }

      if (filters.min_compliance_score !== undefined) {
        query += ` AND compliance_score >= $${paramCount}`;
        values.push(filters.min_compliance_score);
        paramCount++;
      }

      if (filters.available_only) {
        query += ` AND available = true`;
      }

      if (filters.verified_only) {
        query += ` AND verified = true`;
      }

      if (filters.user_id) {
        query += ` AND user_id = $${paramCount}`;
        values.push(filters.user_id);
        paramCount++;
      }

      if (filters.status) {
        query += ` AND status = $${paramCount}`;
        values.push(filters.status);
        paramCount++;
      }

      // Apply sorting
      const sortBy = filters.sort_by || 'created_at';
      const sortDirection = filters.sort_direction || 'desc';
      query += ` ORDER BY ${sortBy} ${sortDirection.toUpperCase()}`;

      // Apply pagination
      const limit = filters.limit || 10;
      const page = filters.page || 1;
      const offset = (page - 1) * limit;

      query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(limit, offset);

      const result: QueryResult = await pgPool.query(query, values);
      
      return result.rows as MineralListing[];
    } catch (error) {
      console.error('Error finding listings with filters:', error);
      throw error;
    }
  }

  /**
   * Get total count of listings with filters
   */
  static async getTotalCount(filters: MineralListingFilter): Promise<number> {
    try {
      let query = 'SELECT COUNT(*) FROM mineral_listings WHERE 1=1';
      const values: any[] = [];
      let paramCount = 1;

      // Apply same filters as findWithFilters (without pagination)
      if (filters.commodity_type) {
        query += ` AND commodity_type = $${paramCount}`;
        values.push(filters.commodity_type);
        paramCount++;
      }

      if (filters.min_price !== undefined) {
        query += ` AND price_per_unit >= $${paramCount}`;
        values.push(filters.min_price);
        paramCount++;
      }

      if (filters.max_price !== undefined) {
        query += ` AND price_per_unit <= $${paramCount}`;
        values.push(filters.max_price);
        paramCount++;
      }

      if (filters.min_volume !== undefined) {
        query += ` AND volume >= $${paramCount}`;
        values.push(filters.min_volume);
        paramCount++;
      }

      if (filters.max_volume !== undefined) {
        query += ` AND volume <= $${paramCount}`;
        values.push(filters.max_volume);
        paramCount++;
      }

      if (filters.origin_location) {
        query += ` AND origin_location ILIKE $${paramCount}`;
        values.push(`%${filters.origin_location}%`);
        paramCount++;
      }

      if (filters.min_compliance_score !== undefined) {
        query += ` AND compliance_score >= $${paramCount}`;
        values.push(filters.min_compliance_score);
        paramCount++;
      }

      if (filters.available_only) {
        query += ` AND available = true`;
      }

      if (filters.verified_only) {
        query += ` AND verified = true`;
      }

      if (filters.user_id) {
        query += ` AND user_id = $${paramCount}`;
        values.push(filters.user_id);
        paramCount++;
      }

      if (filters.status) {
        query += ` AND status = $${paramCount}`;
        values.push(filters.status);
        paramCount++;
      }

      const result: QueryResult = await pgPool.query(query, values);
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error getting total count:', error);
      throw error;
    }
  }

  /**
   * Get all listings with pagination
   */
  static async findAll(page: number = 1, limit: number = 10): Promise<{ listings: MineralListing[], total: number }> {
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const countQuery = 'SELECT COUNT(*) FROM mineral_listings';
      const countResult: QueryResult = await pgPool.query(countQuery);
      const total = parseInt(countResult.rows[0].count);
      
      // Get paginated listings
      const query = `
        SELECT * FROM mineral_listings 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `;
      
      const result: QueryResult = await pgPool.query(query, [limit, offset]);
      
      return {
        listings: result.rows as MineralListing[],
        total
      };
    } catch (error) {
      console.error('Error finding all listings:', error);
      throw error;
    }
  }

  /**
   * Add compliance data to listing
   */
  static async addComplianceData(listingId: number, complianceData: Omit<ComplianceData, 'listing_id' | 'created_at' | 'updated_at'>): Promise<ComplianceData> {
    const client = await pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO listing_compliance (
          listing_id, certification_type, certification_id, certification_date,
          expiry_date, compliance_score, verified_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        listingId,
        complianceData.certification_type,
        complianceData.certification_id,
        complianceData.certification_date,
        complianceData.expiry_date || null,
        complianceData.compliance_score || null,
        complianceData.verified_by || null
      ];
      
      const result: QueryResult = await client.query(query, values);
      
      // Update listing compliance score
      if (complianceData.compliance_score) {
        await client.query(
          'UPDATE mineral_listings SET compliance_score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [complianceData.compliance_score, listingId]
        );
      }
      
      await client.query('COMMIT');
      
      return result.rows[0] as ComplianceData;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding compliance data:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get compliance data for listing
   */
  static async getComplianceData(listingId: number): Promise<ComplianceData[]> {
    try {
      const query = 'SELECT * FROM listing_compliance WHERE listing_id = $1 ORDER BY created_at DESC';
      const result: QueryResult = await pgPool.query(query, [listingId]);
      
      return result.rows as ComplianceData[];
    } catch (error) {
      console.error('Error getting compliance data:', error);
      throw error;
    }
  }

  /**
   * Verify listing
   */
  static async verifyListing(id: number, verifiedBy: string): Promise<MineralListing | null> {
    const client = await pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        UPDATE mineral_listings 
        SET verified = true, verification_date = CURRENT_TIMESTAMP, verified_by = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const result: QueryResult = await client.query(query, [verifiedBy, id]);
      
      await client.query('COMMIT');
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as MineralListing;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error verifying listing:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

// Create mineral_listings table
export const createMineralListingsTable = async (): Promise<void> => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS mineral_listings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      commodity_type VARCHAR(100) NOT NULL,
      volume DECIMAL(10,2) NOT NULL,
      grade VARCHAR(50) NOT NULL,
      origin_location VARCHAR(255) NOT NULL,
      price_per_unit DECIMAL(10,2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      available BOOLEAN DEFAULT TRUE,
      description TEXT,
      images TEXT[],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold', 'pending')),
      compliance_score DECIMAL(3,2),
      verified BOOLEAN DEFAULT FALSE,
      verification_date TIMESTAMP WITH TIME ZONE,
      verified_by VARCHAR(255)
    );
  `;
  
  try {
    await pgPool.query(createTableQuery);
    console.log('Mineral listings table created or already exists');
  } catch (error) {
    console.error('Error creating mineral listings table:', error);
    throw error;
  }
};

// Create listing_compliance table
export const createListingComplianceTable = async (): Promise<void> => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS listing_compliance (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER REFERENCES mineral_listings(id) ON DELETE CASCADE,
      certification_type VARCHAR(100) NOT NULL,
      certification_id VARCHAR(100) NOT NULL,
      certification_date DATE NOT NULL,
      expiry_date DATE,
      compliance_score DECIMAL(3,2),
      verified_by VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await pgPool.query(createTableQuery);
    console.log('Listing compliance table created or already exists');
  } catch (error) {
    console.error('Error creating listing compliance table:', error);
    throw error;
  }
};

// Initialize mineral listing tables
export const initializeMineralListingTables = async (): Promise<void> => {
  try {
    await createMineralListingsTable();
    await createListingComplianceTable();
    console.log('All mineral listing tables initialized');
  } catch (error) {
    console.error('Error initializing mineral listing tables:', error);
    throw error;
  }
};

