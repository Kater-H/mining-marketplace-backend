// src/services/userService.ts
import { pgPool as pool } from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { ApplicationError } from '../utils/applicationError.js';
import { BackendUser } from '../interfaces/user.js'; // Correctly import BackendUser as a named export

export class UserService {
  private pool = pool;

  // Register a new user
  async registerUser(userData: any): Promise<{ user: BackendUser; token: string }> {
    const { firstName, lastName, email, password, role } = userData;

    // Check if user already exists
    const existingUser = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      throw new ApplicationError('User with this email already exists.', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into database, including default compliance_status
    const result = await this.pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, email_verified, compliance_status)
       VALUES ($1, $2, $3, $4, $5, FALSE, 'pending') RETURNING id, first_name, last_name, email, role, email_verified, created_at, updated_at, company_name, phone_number, compliance_status`,
      [firstName, lastName, email, hashedPassword, role]
    );

    const newUser: BackendUser = result.rows[0];

    // Generate JWT token - Explicitly cast secret and expiresIn to string
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, roles: [newUser.role] },
      config.jwtSecret as string,
      { expiresIn: config.jwtExpiresIn as string } // Ensure expiresIn is a string for jwt.sign
    );

    return { user: newUser, token };
  }

  // Login user
  async loginUser(email: string, password: string): Promise<{ user: BackendUser; token: string }> {
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user: BackendUser = result.rows[0];

    if (!user) {
      throw new ApplicationError('Invalid credentials.', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new ApplicationError('Invalid credentials.', 401);
    }

    // Generate JWT token - Explicitly cast secret and expiresIn to string
    const token = jwt.sign(
      { id: user.id, email: user.email, roles: [user.role] },
      config.jwtSecret as string,
      { expiresIn: config.jwtExpiresIn as string } // Ensure expiresIn is a string for jwt.sign
    );

    return { user, token };
  }

  // Get user profile by ID
  async getUserProfile(userId: number): Promise<BackendUser | null> {
    const result = await this.pool.query(
      `SELECT id, first_name, last_name, email, role, email_verified, created_at, updated_at, company_name, phone_number, compliance_status
       FROM users WHERE id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  // Update user profile
  async updateUserProfile(userId: number, updateData: Partial<BackendUser>): Promise<BackendUser> {
    const { first_name, last_name, email } = updateData;

    const result = await this.pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, first_name, last_name, email, role, email_verified, created_at, updated_at, company_name, phone_number, compliance_status`,
      [first_name, last_name, email, userId]
    );

    if (result.rows.length === 0) {
      throw new ApplicationError('User not found.', 404);
    }
    return result.rows[0];
  }

  // Method to update a user's compliance status (Admin-only)
  async updateUserComplianceStatus(userId: number, status: 'pending' | 'compliant' | 'non_compliant'): Promise<BackendUser> {
    const result = await this.pool.query(
      `UPDATE users
       SET compliance_status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, first_name, last_name, email, role, email_verified, created_at, updated_at, company_name, phone_number, compliance_status`,
      [status, userId]
    );

    if (result.rows.length === 0) {
      throw new ApplicationError('User not found.', 404);
    }
    return result.rows[0];
  }
}
