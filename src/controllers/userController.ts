import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService.js'; // Ensure .js
import { UserRole } from '../interfaces/user.js'; // Ensure .js - assuming this interface exists

const userService = new UserService();

// Register a new user
export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    // Assuming registerUser in service now takes individual fields and returns a user object
    const user = await userService.registerUser(firstName, lastName, email, password, role as UserRole);
    res.status(201).json({ message: 'User registered successfully. Please verify your email.', user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    next(error); // Pass error to the error handling middleware
  }
};

// Verify user email
export const verifyUserEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params; // Changed from req.query to req.params as per common practice for tokens in URL path
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Verification token is missing or invalid.' });
    }
    await userService.verifyEmail(token); // Service handles success/failure
    res.status(200).json({ message: 'Email verified successfully!' });
  } catch (error) {
    next(error); // Pass error to the error handling middleware
  }
};

// Login user
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const { user, token } = await userService.loginUser(email, password);
    res.status(200).json({ message: 'Login successful', user, token });
  } catch (error) {
    next(error); // Pass error to the error handling middleware
  }
};

// Get user profile
export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is populated by the authenticate middleware
    const userId = req.user!.id; // Use non-null assertion as middleware ensures it's present
    const userProfile = await userService.getUserProfile(userId);
    if (!userProfile) {
      return res.status(404).json({ message: 'User profile not found.' });
    }
    res.status(200).json(userProfile);
  } catch (error) {
    console.error('Error getting user profile:', error); // Keep for debugging specific controller errors
    next(error); // Pass error to the error handling middleware
  }
};

// Update user profile
export const updateUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id; // User ID from authenticated token
    const { firstName, lastName, email } = req.body; // Fields allowed to be updated
    const updatedUser = await userService.updateUserProfile(userId, { firstName, lastName, email });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found or no updates applied.' });
    }
    res.status(200).json({ message: 'User profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating user profile:', error); // Keep for debugging specific controller errors
    next(error); // Pass error to the error handling middleware
  }
};
