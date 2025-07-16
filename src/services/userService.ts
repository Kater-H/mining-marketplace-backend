import bcrypt from 'bcryptjs'; // External module, no .js
import jwt from 'jsonwebtoken'; // External module, no .js
import { pool } from '../config/database.js'; // Ensure .js is here
import { config } from '../config/config.js'; // Ensure .js is here
import { User, UserRole } from '../interfaces/user.js'; // Ensure .js - assuming this interface exists
import { ApplicationError } from '../utils/applicationError.js'; // Ensure .js - assuming this utility exists

// User service class
export class UserService {
  private pool = pool; // Use the imported pool directly
  private readonly JWT_SECRET = config.jwtSecret;
  private readonly EMAIL_VERIFICATION_SECRET = config.jwtSecret; // Using same secret for simplicity, but ideally separate

  // Register a new user
  async registerUser(firstName: string, lastName: string, email: string, password: string, role: UserRole): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerificationToken = jwt.sign({ email }, this.EMAIL_VERIFICATION_SECRET, { expiresIn: '1d' });
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    try {
      const result = await this.pool.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role, email_verification_token, verification_token_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, first_name, last_name, email, role, email_verified, member_since`,
        [firstName, lastName, email, hashedPassword, role, emailVerificationToken, verificationTokenExpiresAt]
      );
      const newUser: User = result.rows[0];

      // In a real application, you would send an email here
      console.log(`Email verification link for ${email}: /api/users/verify-email/${emailVerificationToken}`);

      // Map snake_case to camelCase for frontend
      return {
        id: newUser.id,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        email: newUser.email,
        role: newUser.role,
        emailVerified: newUser.email_verified,
        memberSince: newUser.member_since // Assuming this comes from DB
      };
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation code
        throw new ApplicationError('Email already registered.', 409);
      }
      throw new ApplicationError('Failed to register user.', 500, error);
    }
  }

  // Verify email with token
  async verifyEmail(token: string): Promise<void> {
    try {
      const decoded: any = jwt.verify(token, this.EMAIL_VERIFICATION_SECRET);
      const { email } = decoded;

      const result = await this.pool.query(
        `UPDATE users SET email_verified = TRUE, email_verification_token = NULL WHERE email = $1 AND email_verification_token = $2 RETURNING id`,
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
      throw new ApplicationError('Failed to verify email.', 500, error);
    }
  }

  // Login user
  async loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
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

    // Return user object without password hash and verification token
    const { password_hash, email_verification_token, verification_token_expires_at, ...userWithoutSensitiveData } = user;
    
    // Map snake_case to camelCase for frontend
    const userForFrontend: User = {
      id: userWithoutSensitiveData.id,
      firstName: userWithoutSensitiveData.first_name,
      lastName: userWithoutSensitiveData.last_name,
      email: userWithoutSensitiveData.email,
      role: userWithoutSensitiveData.role,
      emailVerified: userWithoutSensitiveData.email_verified,
      memberSince: userWithoutSensitiveData.member_since
    };

    return { user: userForFrontend, token };
  }

  // New: Get User Profile by ID
  async getUserProfile(userId: number): Promise<User | null> {
    try {
      const result = await this.pool.query(
        `SELECT id, first_name, last_name, email, role, email_verified, member_since
         FROM users WHERE id = $1`,
        [userId]
      );
      if (result.rows.length === 0) {
        return null;
      }
      const user = result.rows[0];
      // Map snake_case to camelCase for frontend
      return {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        emailVerified: user.email_verified,
        memberSince: user.member_since
      };
    } catch (error) {
      throw new ApplicationError('Failed to retrieve user profile.', 500, error);
    }
  }

  // New: Update User Profile
  async updateUserProfile(userId: number, updates: { firstName?: string; lastName?: string; email?: string }): Promise<User | null> {
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
      // Check if new email already exists for another user
      const checkEmailQuery = `SELECT id FROM users WHERE email = $1 AND id != $2`;
      const emailCheckResult = await this.pool.query(checkEmailQuery, [updates.email, userId]);
      if (emailCheckResult.rows.length > 0) {
        throw new ApplicationError('Email already in use by another account.', 409);
      }
      fields.push(`email = $${queryIndex++}`);
      values.push(updates.email);
    }

    if (fields.length === 0) {
      return this.getUserProfile(userId); // No updates provided, return current profile
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`); // Always update timestamp
    values.push(userId); // Add userId for the WHERE clause

    try {
      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${queryIndex} RETURNING id, first_name, last_name, email, role, email_verified, member_since`;
      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        return null; // User not found or no rows updated
      }
      const updatedUser = result.rows[0];
      // Map snake_case to camelCase for frontend
      return {
        id: updatedUser.id,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        email: updatedUser.email,
        role: updatedUser.role,
        emailVerified: updatedUser.email_verified,
        memberSince: updatedUser.member_since
      };
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation code (e.g., duplicate email)
        throw new ApplicationError('Email already in use.', 409);
      }
      throw new ApplicationError('Failed to update user profile.', 500, error);
    }
  }
}
