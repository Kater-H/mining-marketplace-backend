// @ts-nocheck
import { Request, Response } from 'express';
import UserService from '../services/userService';

// Create an instance of the UserService
export const userService = new UserService(); // Export the instance

// Register a new user
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role, first_name, last_name } = req.body;
    
    // Validate input
    if (!email || !password || !role) {
      res.status(400).json({ message: 'Please provide email, password, and role' });
      return;
    }
    
    // Validate role
    const validRoles = ['miner', 'buyer', 'admin', 'verifier'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ message: 'Invalid role. Must be miner, buyer, admin, or verifier' });
      return;
    }
    
    // Register user
    const { user, verificationToken } = await userService.registerUser({
      email,
      password,
      role,
      first_name,
      last_name
    });
    
    // In a real application, send verification email here
    // For MVP, we'll just return the token in the response
    
    res.status(201).json({
      message: 'User registered successfully',
      user,
      verificationToken, // In production, this would be sent via email
    });
  } catch (error: any) {
    if (error.message === 'Email already in use' || error.message === 'User already exists with this email') {
      res.status(400).json({ message: error.message });
    } else {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error during registration' });
    }
  }
};

// Verify user email
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    
    if (!token) {
      res.status(400).json({ message: 'Verification token is required' });
      return;
    }
    
    const verified = await userService.verifyEmail(token);
    
    if (verified) {
      res.status(200).json({ message: 'Email verified successfully' });
    } else {
      res.status(400).json({ message: 'Invalid or expired verification token' });
    }
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error during email verification' });
  }
};

// Login user
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ message: 'Please provide email and password' });
      return;
    }
    
    const result = await userService.loginUser(email, password);
    const { user, token } = result;
    
    res.status(200).json({
      message: 'Login successful',
      user,
      token
    });
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.message === 'Invalid credentials') {
      res.status(401).json({ message: 'Invalid credentials' });
    } else if (error.message.includes('Email not verified')) {
      res.status(401).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Server error during login' });
    }
  }
};

// Get current user
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // The user ID is added by the auth middleware
    const userId = (req as any).user.id;
    
    const user = await userService.getUserById(userId);
    
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }
    
    res.status(200).json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error getting user data' });
  }
};

