// src/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService.js';
import { ApplicationError } from '../utils/applicationError.js';
import Joi from 'joi';
import { BackendUser } from '../interfaces/user.js'; // Import BackendUser for type clarity

const userService = new UserService();

// Joi schema for user registration validation
const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required(),
  lastName: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('buyer', 'miner', 'admin').default('buyer'),
  // companyName: Joi.string().trim().max(100).optional().allow(''), // Removed
  // phoneNumber: Joi.string().trim().max(20).optional().allow(''), // Removed
});

// Joi schema for user login validation
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Joi schema for user profile update validation
const profileUpdateSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).optional(),
  lastName: Joi.string().trim().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  // companyName: Joi.string().trim().max(100).optional().allow(''), // Removed
  // phoneNumber: Joi.string().trim().max(20).optional().allow(''), // Removed
});

// Joi schema for compliance status update (Admin-only)
const complianceStatusUpdateSchema = Joi.object({
  status: Joi.string().valid('pending', 'compliant', 'non_compliant').required(),
});

// Register a new user
export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw new ApplicationError(error.details[0].message, 400);
    }

    const { user, token } = await userService.registerUser(value); // Destructure to get 'user' and 'token'

    // Map BackendUser to Frontend User for response
    const frontendUser = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      emailVerified: user.email_verified,
      memberSince: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
      // companyName: user.company_name, // Removed
      // phoneNumber: user.phone_number, // Removed
      complianceStatus: user.compliance_status, // Include compliance status
    };

    res.status(201).json({ message: 'User registered successfully.', user: frontendUser, token });
  } catch (error) {
    next(error);
  }
};

// Login user
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new ApplicationError(error.details[0].message, 400);
    }

    const { email, password } = value;
    const { user, token } = await userService.loginUser(email, password); // Destructure to get 'user' and 'token'

    // Map BackendUser to Frontend User for response
    const frontendUser = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      emailVerified: user.email_verified,
      memberSince: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
      // companyName: user.company_name, // Removed
      // phoneNumber: user.phone_number, // Removed
      complianceStatus: user.compliance_status, // Include compliance status
    };

    res.status(200).json({ message: 'Login successful.', user: frontendUser, token });
  } catch (error) {
    next(error);
  }
};

// Get user profile
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id; // User ID from authenticated token
    const user = await userService.getUserProfile(userId);

    if (!user) {
      throw new ApplicationError('User profile not found.', 404);
    }

    // Map BackendUser to Frontend User for response
    const frontendUser = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      emailVerified: user.email_verified,
      memberSince: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
      // companyName: user.company_name, // Removed
      // phoneNumber: user.phone_number, // Removed
      complianceStatus: user.compliance_status, // Include compliance status
    };

    res.status(200).json(frontendUser);
  } catch (error) {
    next(error);
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id; // User ID from authenticated token
    const { error, value } = profileUpdateSchema.validate(req.body);
    if (error) {
      throw new ApplicationError(error.details[0].message, 400);
    }

    // Map frontend camelCase to backend snake_case for update
    const updateData: Partial<BackendUser> = { // Explicitly type updateData
      first_name: value.firstName,
      last_name: value.lastName,
      email: value.email,
      // company_name: value.companyName, // Removed
      // phone_number: value.phoneNumber, // Removed
    };

    const updatedUser = await userService.updateUserProfile(userId, updateData);

    // Map BackendUser to Frontend User for response
    const frontendUser = {
      id: updatedUser.id,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      email: updatedUser.email,
      role: updatedUser.role,
      emailVerified: updatedUser.email_verified,
      memberSince: updatedUser.created_at ? new Date(updatedUser.created_at).toLocaleDateString() : 'N/A',
      // companyName: updatedUser.company_name, // Removed
      // phoneNumber: updatedUser.phone_number, // Removed
      complianceStatus: updatedUser.compliance_status, // Include compliance status
    };

    res.status(200).json({ message: 'Profile updated successfully.', user: frontendUser });
  } catch (error) {
    next(error);
  }
};

// Admin-only endpoint to set a user's compliance status
export const setUserComplianceStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userIdToUpdate = parseInt(req.params.userId); // User ID from URL parameter
    if (isNaN(userIdToUpdate)) {
      throw new ApplicationError('Invalid user ID provided.', 400);
    }

    const { error, value } = complianceStatusUpdateSchema.validate(req.body);
    if (error) {
      throw new ApplicationError(error.details[0].message, 400);
    }

    const { status } = value;
    const updatedUser = await userService.updateUserComplianceStatus(userIdToUpdate, status);

    // Map BackendUser to Frontend User for response
    const frontendUser = {
      id: updatedUser.id,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      email: updatedUser.email,
      role: updatedUser.role,
      emailVerified: updatedUser.email_verified,
      memberSince: updatedUser.created_at ? new Date(updatedUser.created_at).toLocaleDateString() : 'N/A',
      // companyName: updatedUser.company_name, // Removed
      // phoneNumber: updatedUser.phone_number, // Removed
      complianceStatus: updatedUser.compliance_status, // Include compliance status
    };

    res.status(200).json({ message: `User ${userIdToUpdate} compliance status updated to ${status}.`, user: frontendUser });
  } catch (error) {
    next(error);
  }
};
