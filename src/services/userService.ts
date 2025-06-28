// CHANGED: Import jsonwebtoken using import instead of require
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs'; // External module, no .js
import { Pool } from 'pg'; // External module, no .js
import { getPool } from '../config/database.js'; // Ensure .js is here
import { config } from '../config/config.js'; // Ensure .js is here

// User service class - export as default to ensure consistent import pattern
class UserService {
  private pool: Pool;

  constructor(userModel?: any) {
    // Use provided pool (for testing) or get the appropriate pool
    this.pool = userModel?.pool || getPool();
  }

  // Register a new user
  async registerUser(userData: any): Promise<any> {
    try {
      // Check if email already exists
      const checkEmailQuery = `
        SELECT id FROM users
        WHERE email = $1
      `;

      const emailResult = await this.pool.query(checkEmailQuery, [userData.email]);

      if (emailResult.rows.length > 0) {
        throw new Error('Email already in use');
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Generate verification token
      const verificationToken = jwt.sign(
        { email: userData.email },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      // Insert user
      const insertUserQuery = `
        INSERT INTO users (
          first_name, last_name, email, password_hash, role, verification_token
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, first_name, last_name, email, role, is_verified, verification_token
      `;

      const role = userData.role || 'buyer'; // Default role is buyer

      const userResult = await this.pool.query(insertUserQuery, [
        userData.first_name,
        userData.last_name,
        userData.email,
        hashedPassword,
        role,
        verificationToken
      ]);

      const user = userResult.rows[0];

      return {
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role,
          isVerified: user.is_verified
        },
        verificationToken: user.verification_token
      };
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  // Verify email with token
  async verifyEmail(token: string): Promise<boolean> {
    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret) as { email: string };

      if (!decoded || !decoded.email) {
        return false;
      }

      // Update user is_verified status
      const updateQuery = `
        UPDATE users
        SET is_verified = true, updated_at = CURRENT_TIMESTAMP
        WHERE email = $1
        RETURNING id
      `;

      const result = await this.pool.query(updateQuery, [decoded.email]);

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error verifying email:', error);
      return false;
    }
  }

  // Login user
  async loginUser(email: string, password: string): Promise<any> {
    try {
      // Get user by email
      const getUserQuery = `
        SELECT id, first_name, last_name, email, password_hash, role, is_verified
        FROM users
        WHERE email = $1
      `;

      const userResult = await this.pool.query(getUserQuery, [email]);

      if (userResult.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = userResult.rows[0];

      // Check if email is verified
      if (!user.is_verified) {
        throw new Error('Email not verified. Please verify your email before logging in.');
      }

      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT token - using require style import to avoid TypeScript issues
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          roles: [user.role] // Convert single role to array for middleware compatibility
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      return {
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role,
          isVerified: user.is_verified
        },
        token
      };
    } catch (error) {
      console.error('Error logging in user:', error);
      throw error;
    }
  }

  // Get user by ID
  async getUserById(id: number): Promise<any> {
    try {
      const query = `
        SELECT id, first_name, last_name, email, role, is_verified
        FROM users
        WHERE id = $1
      `;

      const result = await this.pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        isVerified: user.is_verified
      };
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  // Update user
  async updateUser(id: number, userData: any): Promise<any> {
    try {
      // Check if user exists
      const checkUserQuery = `
        SELECT id FROM users
        WHERE id = $1
      `;

      const userResult = await this.pool.query(checkUserQuery, [id]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      // Build update query
      let updateQuery = 'UPDATE users SET ';
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      const updateFields: string[] = [];

      if (userData.first_name) {
        updateFields.push(`first_name = $${paramIndex++}`);
        queryParams.push(userData.first_name);
      }

      if (userData.last_name) {
        updateFields.push(`last_name = $${paramIndex++}`);
        queryParams.push(userData.last_name);
      }

      if (userData.email) {
        // Check if email already exists for another user
        const checkEmailQuery = `
          SELECT id FROM users
          WHERE email = $1 AND id != $2
        `;

        const emailResult = await this.pool.query(checkEmailQuery, [userData.email, id]);

        if (emailResult.rows.length > 0) {
          throw new Error('Email already in use');
        }

        updateFields.push(`email = $${paramIndex++}`);
        queryParams.push(userData.email);
      }

      if (userData.password) {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        updateFields.push(`password = $${paramIndex++}`);
        queryParams.push(hashedPassword);
      }

      if (userData.roles) {
        updateFields.push(`roles = $${paramIndex++}`);
        queryParams.push(userData.roles);
      }

      // Check if there are any fields to update before adding timestamp
      if (updateFields.length === 0) {
        // No fields to update
        return { message: 'No fields to update' };
      }

      // Add updated_at timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      updateQuery += updateFields.join(', ');
      updateQuery += ` WHERE id = $${paramIndex++}`;
      queryParams.push(id);

      updateQuery += ' RETURNING id, first_name, last_name, email, roles';

      // Execute update
      const result = await this.pool.query(updateQuery, queryParams);

      return result.rows[0];
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
}

// Export as default for consistent import pattern
export default UserService;
// Also export as named export for backward compatibility
export { UserService };
