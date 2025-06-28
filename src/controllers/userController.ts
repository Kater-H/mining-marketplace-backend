import { Request, Response } from 'express';
import { UserService } from '../services/userService.js'; // ADDED .js
import { UserRegistrationData, UserLoginResponse, UserRole } from '../interfaces/user.js'; // ADDED .js

const userService = new UserService();

// Register a new user
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: UserRegistrationData = req.body;
    const { user, verificationToken } = await userService.registerUser(userData);
    res.status(201).json({
      message: 'User registered successfully. Please check your email for verification.',
      user,
      verificationToken // In a real app, you might not send this back to the client directly
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(400).json({ message: (error as Error).message });
  }
};

// Verify user email
export const verifyUserEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      res.status(400).json({ message: 'Verification token is missing or invalid.' });
      return;
    }

    const success = await userService.verifyEmail(token);
    if (success) {
      res.status(200).json({ message: 'Email verified successfully!' });
    } else {
      res.status(400).json({ message: 'Invalid or expired verification token.' });
    }
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ message: 'Failed to verify email.', error: (error as Error).message });
  }
};

// Login user
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }
    const { user, token } = await userService.loginUser(email, password);
    res.status(200).json({ message: 'Login successful', user, token });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(401).json({ message: (error as Error).message });
  }
};

// Get user profile
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id; // User ID from authenticated token
    const user = await userService.getUserById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ message: 'Failed to retrieve user profile', error: (error as Error).message });
  }
};

// Update user profile
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id; // User ID from authenticated token
    const updatedUser = await userService.updateUser(userId, req.body);
    if (!updatedUser) {
      res.status(404).json({ message: 'User not found or no updates applied.' });
      return;
    }
    res.status(200).json({ message: 'User profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Failed to update user profile', error: (error as Error).message });
  }
};
