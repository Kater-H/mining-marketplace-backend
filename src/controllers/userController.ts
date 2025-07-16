// src/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService.js';
import { UserRole, UserRegistrationData } from '../interfaces/user.js';

const userService = new UserService();

// Register a new user
export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    const user = await userService.registerUser(firstName, lastName, email, password, role as UserRole);
    res.status(201).json({
      message: 'User registered successfully. You can now log in.', // Updated message
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        emailVerified: user.email_verified,
        memberSince: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
        companyName: user.company_name,
        phoneNumber: user.phone_number,
      }
    });
  } catch (error) {
    next(error);
  }
};

// REMOVED: verifyUserEmail function is no longer needed
/*
export const verifyUserEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string') {
      return next(new Error('Verification token is missing or invalid.'));
    }
    await userService.verifyEmail(token);
    res.status(200).json({ message: 'Email verified successfully!' });
  } catch (error) {
    next(error);
  }
};
*/

// Login user
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new Error('Email and password are required.'));
    }
    const { user, token } = await userService.loginUser(email, password);
    const userForFrontend = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      emailVerified: user.email_verified,
      memberSince: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
      companyName: user.company_name,
      phoneNumber: user.phone_number,
    };
    res.status(200).json({ message: 'Login successful', user: userForFrontend, token });
  } catch (error) {
    next(error);
  }
};

// Get user profile
export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const userProfile = await userService.getUserProfile(userId);
    if (!userProfile) {
      return next(new Error('User profile not found.'));
    }
    const userProfileForFrontend = {
      id: userProfile.id,
      firstName: userProfile.first_name,
      lastName: userProfile.last_name,
      email: userProfile.email,
      role: userProfile.role,
      emailVerified: userProfile.email_verified,
      memberSince: userProfile.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'N/A',
      companyName: userProfile.company_name,
      phoneNumber: userProfile.phone_number,
    };
    res.status(200).json(userProfileForFrontend);
  } catch (error) {
    console.error('Error getting user profile:', error);
    next(error);
  }
};

// Update user profile
export const updateUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { firstName, lastName, email } = req.body;
    const updatedUser = await userService.updateUserProfile(userId, { firstName, lastName, email });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found or no changes applied.' });
    }
    const updatedUserForFrontend = {
      id: updatedUser.id,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      email: updatedUser.email,
      role: updatedUser.role,
      emailVerified: updatedUser.email_verified,
      memberSince: updatedUser.created_at ? new Date(updatedUser.created_at).toLocaleDateString() : 'N/A',
      companyName: updatedUser.company_name,
      phoneNumber: updatedUser.phone_number,
    };
    res.status(200).json({ message: 'User profile updated successfully', user: updatedUserForFrontend });
  } catch (error) {
    console.error('Error updating user profile:', error);
    next(error);
  }
};
