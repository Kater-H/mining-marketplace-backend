// src/services/userService.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pgPool as pool } from '../config/database.js';
import { config } from '../config/config.js';
import { User, UserRole, UserRegistrationData } from '../interfaces/user.js';
import { ApplicationError } from '../utils/applicationError.js';

// User service class
export class UserService {
  private pool = pool;
  private readonly JWT_SECRET = config.jwtSecret;
  private readonly EMAIL_VERIFICATION_SECRET = config.jwtSecret;

  // Register a new user
  async registerUser(firstName: string, lastName: string, email: string, password: string, role: UserRole): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerificationToken = jwt.sign({ email }, this.EMAIL_VERIFICATION_SECRET, { expiresIn: '1d' });
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    try {
      const result = await this.pool.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role, email_verification_token, verification_token_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, first_name, last_name, email, role, email_verified, created_at, updated_at`, // Removed company_name, phone_number
        [firstName, lastName, email, hashedPassword, role, emailVerificationToken, verificationTokenExpiresAt]
      );
      const newUser = result.rows[0];

      console.log(`Email verification link for ${email}: /api/users/verify-email/${emailVerificationToken}`);

      return {
        id: newUser.id,
        email: newUser.email,
        password: '',
        role: newUser.role,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email_verified: newUser.email_verified,
        verification_token: newUser.email_verification_token,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at,
        // company_name: newUser.company_name, // Removed
        // phone_number: newUser.phone_number, // Removed
      };
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ApplicationError('Email already registered.', 409);
      }
      throw new ApplicationError('Failed to register user.', 500, error as Error);
    }
  }

  // Verify email with token
  async verifyEmail(token: string): Promise<void> {
    try {
      const decoded: any = jwt.verify(token, this.EMAIL_VERIFICATION_SECRET);
      const { email } = decoded;

      const result = await this.pool.query(
        `UPDATE users SET email_verified = TRUE, email_verification_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE email = $1 AND email_verification_token = $2 RETURNING id`,
        [email, token]
      );

      if (result.rowCount === 0) {
        throw new ApplicationError('Invalid or expired verification token.', 400);
      }
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new ApplicationError('Email verification token has expired.', 400);
      }
      if (error.name === 'JsonWebTokenError') {
        throw new ApplicationError('Invalid email verification token.', 400);
      }
      throw new ApplicationError('Failed to verify email.', 500, error as Error);
    }
  }

  // Login user
  async loginUser(email: string, password: string): Promise<{ user: Omit<User, 'password' | 'verification_token'>; token: string }> {
    const result = await this.pool.query('SELECT id, first_name, last_name, email, password_hash, role, email_verified, created_at, updated_at FROM users WHERE email = $1', [email]); // Removed company_name, phone_number
    const user = result.rows[0];

    if (!user) {
      throw new ApplicationError('Invalid credentials.', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new ApplicationError('Invalid credentials.', 401);
    }

    if (!user.email_verified) {
      throw new ApplicationError('Please verify your email before logging in.', 403);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, roles: [user.role] },
      this.JWT_SECRET,
      { expiresIn: config.jwtExpiresIn }
    );

    const userForFrontend: Omit<User, 'password' | 'verification_token'> = {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      email_verified: user.email_verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      // company_name: user.company_name, // Removed
      // phone_number: user.phone_number, // Removed
    };

    return { user: userForFrontend, token };
  }

  // Get User Profile by ID
  async getUserProfile(userId: number): Promise<Omit<User, 'password' | 'verification_token'> | null> {
    try {
      const result = await this.pool.query(
        `SELECT id, first_name, last_name, email, role, email_verified, created_at, updated_at
         FROM users WHERE id = $1`, // Removed company_name, phone_number
        [userId]
      );
      if (result.rows.length === 0) {
        return null;
      }
      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        email_verified: user.email_verified,
        created_at: user.created_at,
        updated_at: user.updated_at,
        // company_name: user.company_name, // Removed
        // phone_number: user.phone_number, // Removed
      };
    } catch (error) {
      throw new ApplicationError('Failed to retrieve user profile.', 500, error as Error);
    }
  }

  // Update User Profile
  async updateUserProfile(userId: number, updates: { firstName?: string; lastName?: string; email?: string }): Promise<Omit<User, 'password' | 'verification_token'> | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;

    if (updates.firstName !== undefined) {
      fields.push(`first_name = $${queryIndex++}`);
      values.push(updates.firstName);
    }
    if (updates.lastName !== undefined) {
      fields.push(`last_name = $${queryIndex++}`);
      values.push(updates.lastName);
    }
    if (updates.email !== undefined) {
      const checkEmailQuery = `SELECT id FROM users WHERE email = $1 AND id != $2`;
      const emailCheckResult = await this.pool.query(checkEmailQuery, [updates.email, userId]);
      if (emailCheckResult.rows.length > 0) {
        throw new ApplicationError('Email already in use by another account.', 409);
      }
      fields.push(`email = $${queryIndex++}`);
      values.push(updates.email);
    }

    if (fields.length === 0) {
      return this.getUserProfile(userId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    try {
      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${queryIndex} RETURNING id, first_name, last_name, email, role, email_verified, created_at, updated_at`; // Removed company_name, phone_number
      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }
      const updatedUser = result.rows[0];
      return {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        email_verified: updatedUser.email_verified,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
        // company_name: updatedUser.company_name, // Removed
        // phone_number: updatedUser.phone_number, // Removed
      };
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ApplicationError('Email already in use.', 409);
      }
      throw new ApplicationError('Failed to update user profile.', 500, error as Error);
    }
  }
}
