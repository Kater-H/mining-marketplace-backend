import { Pool } from 'pg';
import { getPool } from '../config/database.js'; // Ensure .js is here

// Define a basic interface for the user data as it comes from the backend/DB
// This should align with your actual database table columns
export interface BackendUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string; // Assuming you store hashed passwords
  role: 'buyer' | 'miner' | 'admin';
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
  compliance_status: 'pending' | 'compliant' | 'non_compliant';
  company_name?: string; // New field
  phone_number?: string; // New field
  location?: string; // New field
  preferred_mineral_types?: string[]; // New field (PostgreSQL TEXT[])
  minimum_purchase_quantity?: number; // New field (PostgreSQL NUMERIC)
  required_regulations?: string[]; // New field (PostgreSQL TEXT[])
}

// Interface for user data when registering or updating profile
export interface UserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  role?: 'buyer' | 'miner' | 'admin';
  companyName?: string;
  phoneNumber?: string;
  location?: string;
  preferredMineralTypes?: string[];
  minimumPurchaseQuantity?: number;
  requiredRegulations?: string[];
}

export class UserModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Registers a new user in the database.
   * @param userData - The user data including new profile fields.
   * @returns The newly created user.
   */
  async registerUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string; // Hashed password
    role: 'buyer' | 'miner' | 'admin';
    companyName: string; // Mandatory
    phoneNumber?: string;
    location: string; // Mandatory
  }): Promise<BackendUser> {
    const { firstName, lastName, email, passwordHash, role, companyName, phoneNumber, location } = userData;
    const result = await this.pool.query(
      `INSERT INTO users (
        first_name, last_name, email, password_hash, role, company_name, phone_number, location, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *`,
      [firstName, lastName, email, passwordHash, role, companyName, phoneNumber, location]
    );
    return result.rows[0];
  }

  /**
   * Finds a user by their email.
   * @param email - The user's email.
   * @returns The user if found, otherwise null.
   */
  async getUserByEmail(email: string): Promise<BackendUser | null> {
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  /**
   * Finds a user by their ID.
   * @param id - The user's ID.
   * @returns The user if found, otherwise null.
   */
  async getUserById(id: number): Promise<BackendUser | null> {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Updates a user's profile information.
   * @param id - The ID of the user to update.
   * @param updates - An object containing the fields to update.
   * @returns The updated user.
   */
  async updateUserProfile(id: number, updates: {
    first_name?: string;
    last_name?: string;
    email?: string;
    company_name?: string;
    phone_number?: string;
    location?: string;
    preferred_mineral_types?: string[];
    minimum_purchase_quantity?: number;
    required_regulations?: string[];
  }): Promise<BackendUser> {
    const fields = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    const values = Object.values(updates);

    if (values.length === 0) {
      const user = await this.getUserById(id); // If no updates, just return current user
      if (!user) throw new Error('User not found');
      return user;
    }

    const result = await this.pool.query(
      `UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  }

  /**
   * Updates a user's compliance status (admin only).
   * @param id - The ID of the user to update.
   * @param status - The new compliance status.
   * @returns The updated user.
   */
  async updateUserComplianceStatus(id: number, status: 'pending' | 'compliant' | 'non_compliant'): Promise<BackendUser> {
    const result = await this.pool.query(
      `UPDATE users SET compliance_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0];
  }

  /**
   * Gets all users from the database.
   * @returns An array of all users.
   */
  async getAllUsers(): Promise<BackendUser[]> {
    const result = await this.pool.query('SELECT * FROM users');
    return result.rows;
  }
}
