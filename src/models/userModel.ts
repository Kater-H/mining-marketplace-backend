import { pgPool } from '../config/database';
import { QueryResult } from 'pg';

// User interface
export interface User {
  id: number;
  email: string;
  password: string;
  role: string;
  first_name?: string;
  last_name?: string;
  created_at: Date;
  updated_at: Date;
  email_verified: boolean;
  verification_token?: string;
  verification_token_expires?: Date;
  reset_password_token?: string;
  reset_password_expires?: Date;
}

// User creation data interface
export interface CreateUserData {
  email: string;
  password: string;
  role: string;
  first_name?: string;
  last_name?: string;
  verification_token?: string;
  verification_token_expires?: Date;
}

// User update data interface
export interface UpdateUserData {
  email?: string;
  password?: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  email_verified?: boolean;
  verification_token?: string;
  verification_token_expires?: Date;
  reset_password_token?: string;
  reset_password_expires?: Date;
}

// UserModel class with CRUD operations
export class UserModel {
  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result: QueryResult = await pgPool.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as User;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result: QueryResult = await pgPool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as User;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find user by verification token
   */
  static async findByVerificationToken(token: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE verification_token = $1 AND verification_token_expires > NOW()';
      const result: QueryResult = await pgPool.query(query, [token]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as User;
    } catch (error) {
      console.error('Error finding user by verification token:', error);
      throw error;
    }
  }

  /**
   * Find user by reset password token
   */
  static async findByResetToken(token: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()';
      const result: QueryResult = await pgPool.query(query, [token]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as User;
    } catch (error) {
      console.error('Error finding user by reset token:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   */
  static async create(userData: CreateUserData): Promise<User> {
    const client = await pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO users (email, password, role, first_name, last_name, verification_token, verification_token_expires)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        userData.email,
        userData.password,
        userData.role,
        userData.first_name || null,
        userData.last_name || null,
        userData.verification_token || null,
        userData.verification_token_expires || null
      ];
      
      const result: QueryResult = await client.query(query, values);
      
      await client.query('COMMIT');
      
      return result.rows[0] as User;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update user by ID
   */
  static async update(id: number, userData: UpdateUserData): Promise<User | null> {
    const client = await pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      Object.entries(userData).forEach(([key, value]) => {
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
        UPDATE users 
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
      
      return result.rows[0] as User;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete user by ID
   */
  static async delete(id: number): Promise<boolean> {
    const client = await pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = 'DELETE FROM users WHERE id = $1';
      const result: QueryResult = await client.query(query, [id]);
      
      await client.query('COMMIT');
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update email verification status
   */
  static async updateVerificationStatus(id: number, verified: boolean): Promise<User | null> {
    const client = await pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        UPDATE users 
        SET email_verified = $1, verification_token = NULL, verification_token_expires = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const result: QueryResult = await client.query(query, [verified, id]);
      
      await client.query('COMMIT');
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as User;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating verification status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(id: number, hashedPassword: string): Promise<User | null> {
    const client = await pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        UPDATE users 
        SET password = $1, reset_password_token = NULL, reset_password_expires = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const result: QueryResult = await client.query(query, [hashedPassword, id]);
      
      await client.query('COMMIT');
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as User;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating password:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Set reset password token
   */
  static async setResetPasswordToken(id: number, token: string, expires: Date): Promise<User | null> {
    const client = await pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        UPDATE users 
        SET reset_password_token = $1, reset_password_expires = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      
      const result: QueryResult = await client.query(query, [token, expires, id]);
      
      await client.query('COMMIT');
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as User;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error setting reset password token:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all users with pagination
   */
  static async findAll(page: number = 1, limit: number = 10): Promise<{ users: User[], total: number }> {
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const countQuery = 'SELECT COUNT(*) FROM users';
      const countResult: QueryResult = await pgPool.query(countQuery);
      const total = parseInt(countResult.rows[0].count);
      
      // Get paginated users
      const query = `
        SELECT * FROM users 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `;
      
      const result: QueryResult = await pgPool.query(query, [limit, offset]);
      
      return {
        users: result.rows as User[],
        total
      };
    } catch (error) {
      console.error('Error finding all users:', error);
      throw error;
    }
  }

  /**
   * Find users by role
   */
  static async findByRole(role: string): Promise<User[]> {
    try {
      const query = 'SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC';
      const result: QueryResult = await pgPool.query(query, [role]);
      
      return result.rows as User[];
    } catch (error) {
      console.error('Error finding users by role:', error);
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    try {
      const query = 'SELECT 1 FROM users WHERE email = $1';
      const result: QueryResult = await pgPool.query(query, [email]);
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking if email exists:', error);
      throw error;
    }
  }
}

// Create users table
export const createUsersTable = async (): Promise<void> => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      email_verified BOOLEAN DEFAULT FALSE,
      verification_token VARCHAR(255),
      verification_token_expires TIMESTAMP WITH TIME ZONE,
      reset_password_token VARCHAR(255),
      reset_password_expires TIMESTAMP WITH TIME ZONE
    );
  `;
  
  try {
    await pgPool.query(createTableQuery);
    console.log('Users table created or already exists');
  } catch (error) {
    console.error('Error creating users table:', error);
    throw error;
  }
};

// Create miner_profiles table
export const createMinerProfilesTable = async (): Promise<void> => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS miner_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      mining_license_number VARCHAR(100),
      mining_region VARCHAR(100),
      mining_experience INTEGER,
      primary_minerals VARCHAR(255)[],
      gps_coordinates POINT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await pgPool.query(createTableQuery);
    console.log('Miner profiles table created or already exists');
  } catch (error) {
    console.error('Error creating miner profiles table:', error);
    throw error;
  }
};

// Create buyer_profiles table
export const createBuyerProfilesTable = async (): Promise<void> => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS buyer_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      company_name VARCHAR(255),
      company_registration_number VARCHAR(100),
      business_type VARCHAR(100),
      minerals_of_interest VARCHAR(255)[],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await pgPool.query(createTableQuery);
    console.log('Buyer profiles table created or already exists');
  } catch (error) {
    console.error('Error creating buyer profiles table:', error);
    throw error;
  }
};

// Create admin_profiles table
export const createAdminProfilesTable = async (): Promise<void> => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS admin_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      admin_level VARCHAR(50),
      permissions TEXT[],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await pgPool.query(createTableQuery);
    console.log('Admin profiles table created or already exists');
  } catch (error) {
    console.error('Error creating admin profiles table:', error);
    throw error;
  }
};

// Create verifier_profiles table
export const createVerifierProfilesTable = async (): Promise<void> => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS verifier_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      organization_name VARCHAR(255),
      certification_number VARCHAR(100),
      verification_specialties VARCHAR(255)[],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await pgPool.query(createTableQuery);
    console.log('Verifier profiles table created or already exists');
  } catch (error) {
    console.error('Error creating verifier profiles table:', error);
    throw error;
  }
};

// Initialize all database tables
export const initializeTables = async (): Promise<void> => {
  try {
    await createUsersTable();
    await createMinerProfilesTable();
    await createBuyerProfilesTable();
    await createAdminProfilesTable();
    await createVerifierProfilesTable();
    console.log('All user-related tables initialized');
  } catch (error) {
    console.error('Error initializing tables:', error);
    throw error;
  }
};

