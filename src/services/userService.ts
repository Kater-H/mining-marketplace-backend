// src/services/userService.ts
import { UserModel, BackendUser, UserInput } from '../models/userModel.js'; // Import BackendUser and UserInput from userModel
import bcrypt from 'bcryptjs'; // <--- CHANGED: Import bcryptjs instead of bcrypt
import jwt from 'jsonwebtoken';
import { ApplicationError } from '../utils/applicationError.js'; // Assuming this utility exists

const userModel = new UserModel();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; // Use environment variable for secret

export class UserService {
  /**
   * Registers a new user.
   * @param data - User registration data (firstName, lastName, email, password, role, companyName, phoneNumber, location).
   * @returns The registered user and a JWT token.
   */
  async registerUser(data: UserInput): Promise<{ user: BackendUser; token: string }> {
    const { firstName, lastName, email, password, role, companyName, phoneNumber, location } = data;

    if (!email || !password || !firstName || !lastName || !companyName || !location) {
      throw new ApplicationError('Missing required registration fields.', 400);
    }

    const existingUser = await userModel.getUserByEmail(email);
    if (existingUser) {
      throw new ApplicationError('User with this email already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10); // Hash the password

    const newUser = await userModel.registerUser({
      firstName,
      lastName,
      email,
      passwordHash,
      role: role || 'buyer', // Default to 'buyer' if not provided
      companyName,
      phoneNumber,
      location,
    });

    const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '1h' });

    return { user: newUser, token };
  }

  /**
   * Logs in a user.
   * @param email - User's email.
   * @param password - User's plain text password.
   * @returns The logged-in user and a JWT token.
   */
  async loginUser(email: string, password: string): Promise<{ user: BackendUser; token: string }> {
    const user = await userModel.getUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new ApplicationError('Invalid credentials.', 401);
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    return { user, token };
  }

  /**
   * Gets a user by their ID.
   * @param id - User ID.
   * @returns The user.
   */
  async getUserById(id: number): Promise<BackendUser | null> {
    return userModel.getUserById(id);
  }

  /**
   * Updates a user's profile.
   * @param id - User ID.
   * @param updates - Fields to update.
   * @returns The updated user.
   */
  async updateUserProfile(id: number, updates: Partial<BackendUser>): Promise<BackendUser> {
    const updatedUser = await userModel.updateUserProfile(id, updates);
    if (!updatedUser) {
      throw new ApplicationError('User not found or profile could not be updated.', 404);
    }
    return updatedUser;
  }

  /**
   * Updates a user's compliance status.
   * @param id - User ID.
   * @param status - New compliance status.
   * @returns The updated user.
   */
  async updateUserComplianceStatus(id: number, status: 'pending' | 'compliant' | 'non_compliant'): Promise<BackendUser> {
    const updatedUser = await userModel.updateUserComplianceStatus(id, status);
    if (!updatedUser) {
      throw new ApplicationError('User not found or compliance status could not be updated.', 404);
    }
    return updatedUser;
  }

  /**
   * Gets all users (admin only).
   * @returns An array of all users.
   */
  async getAllUsers(): Promise<BackendUser[]> {
    return userModel.getAllUsers();
  }
}
