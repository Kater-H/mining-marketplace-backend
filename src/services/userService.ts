// src/services/userService.ts
import { pgPool as pool } from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken'; // Import Secret and SignOptions
import { config } from '../config/config.js';
import { ApplicationError } from '../utils/applicationError.js';
import { BackendUser } from '../interfaces/user.js'; 

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
      `INSERT INTO users (first_name, last_name, email, password_hash, role, email_verified, compliance_status)\
       VALUES ($1, $2, $3, $4, $5, FALSE, 'pending') RETURNING id, first_name, last_name, email, role, email_verified, created_at, updated_at, compliance_status`, // Removed company_name, phone_number
      [firstName, lastName, email, hashedPassword, role]
    );

    const newUser: BackendUser = result.rows[0];
    const token = this.generateAuthToken(newUser.id, newUser.email, newUser.role);

    return { user: newUser, token };
  }

  // Log in a user
  async loginUser(email: string, password: string): Promise<{ user: BackendUser; token: string }> {
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      throw new ApplicationError('Invalid credentials.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new ApplicationError('Invalid credentials.', 401);
    }

    const token = this.generateAuthToken(user.id, user.email, user.role);
    return { user, token };
  }

  // Generate JWT token
  private generateAuthToken(id: number, email: string, role: string): string {
    const payload = { id, email, roles: [role] }; // Ensure roles is an array
    const options: SignOptions = { expiresIn: '1h' }; // Token expires in 1 hour
    return jwt.sign(payload, config.jwtSecret as Secret, options);
  }

  // Get user by ID
  async getUserById(id: number): Promise<BackendUser | null> {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
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
       SET first_name = COALESCE($1, first_name),\
           last_name = COALESCE($2, last_name),\
           email = COALESCE($3, email),\
           updated_at = CURRENT_TIMESTAMP\
       WHERE id = $4\
       RETURNING id, first_name, last_name, email, role, email_verified, created_at, updated_at, compliance_status`, // Removed company_name, phone_number
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
      `UPDATE users\
       SET compliance_status = $1,\
           updated_at = CURRENT_TIMESTAMP\
       WHERE id = $2\
       RETURNING id, first_name, last_name, email, role, email_verified, created_at, updated_at, compliance_status`, // Removed company_name, phone_number
      [status, userId]
    );

    if (result.rows.length === 0) {
      throw new ApplicationError('User not found or no changes made.', 404);
    }
    return result.rows[0];
  }

  // NEW: Get all users (for admin panel)
  async getAllUsers(): Promise<BackendUser[]> {
    try {
      const result = await this.pool.query('SELECT * FROM users ORDER BY created_at DESC');
      return result.rows;
    } catch (error) {
      throw new ApplicationError('Failed to retrieve all users.', 500, error as Error);
    }
  }
}
