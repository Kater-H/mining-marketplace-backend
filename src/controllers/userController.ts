// src/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService.js'; // Assuming UserService exists and uses UserModel
import { ApplicationError } from '../utils/applicationError.js';
import Joi from 'joi';
// Assuming BackendUser and UserInput are defined in a shared interface file or directly in UserModel.ts
// For this example, I'll assume BackendUser is imported or defined in UserModel.ts and accessible.
// If you have a separate interfaces/user.ts, ensure it's updated and imported here.
import { BackendUser, UserInput } from '../models/userModel.js'; // Adjust path if BackendUser is elsewhere

const userService = new UserService();

// Joi schema for user registration validation
const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required(),
  lastName: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('buyer', 'miner', 'admin').default('buyer'),
  companyName: Joi.string().trim().min(1).max(100).required(), // Made mandatory
  phoneNumber: Joi.string().trim().optional().allow(''), // Optional
  location: Joi.string().trim().min(1).max(100).required(), // Made mandatory
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
  companyName: Joi.string().trim().min(1).max(100).required(), // Mandatory for update
  phoneNumber: Joi.string().trim().optional().allow(''),
  location: Joi.string().trim().min(1).max(100).required(), // Mandatory for update
  // Buyer-specific fields, optional for update
  preferredMineralTypes: Joi.array().items(Joi.string().trim()).optional(),
  minimumPurchaseQuantity: Joi.number().min(0).optional(),
  requiredRegulations: Joi.array().items(Joi.string().trim()).optional(),
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
    // Pass all validated fields to the service layer
    const { user, token } = await userService.registerUser(value);
    // Map BackendUser to Frontend User for response
    const frontendUser = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      emailVerified: user.email_verified,
      memberSince: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
      companyName: user.company_name,
      phoneNumber: user.phone_number,
      location: user.location,
      complianceStatus: user.compliance_status,
      preferredMineralTypes: user.preferred_mineral_types || [],
      minimumPurchaseQuantity: user.minimum_purchase_quantity,
      requiredRegulations: user.required_regulations || [],
    };
    res.status(201).json({ message: 'User registered successfully!', user: frontendUser, token });
  } catch (error) {
    next(error);
  }
};

// Log in a user
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new ApplicationError(error.details[0].message, 400);
    }
    const { email, password } = value;
    const { user, token } = await userService.loginUser(email, password);
    // Map BackendUser to Frontend User for response
    const frontendUser = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      emailVerified: user.email_verified,
      memberSince: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
      companyName: user.company_name,
      phoneNumber: user.phone_number,
      location: user.location,
      complianceStatus: user.compliance_status,
      preferredMineralTypes: user.preferred_mineral_types || [],
      minimumPurchaseQuantity: user.minimum_purchase_quantity,
      requiredRegulations: user.required_regulations || [],
    };
    res.status(200).json({ message: 'Logged in successfully!', user: frontendUser, token });
  } catch (error) {
    next(error);
  }
};

// Get user profile
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApplicationError('User not authenticated.', 401);
    }
    const user = await userService.getUserById(req.user.id);
    if (!user) {
      throw new ApplicationError('User not found.', 404);
    }
    // Map BackendUser to Frontend User for response, including all new fields
    const frontendUser = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      emailVerified: user.email_verified,
      memberSince: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
      companyName: user.company_name,
      phoneNumber: user.phone_number,
      location: user.location,
      complianceStatus: user.compliance_status,
      preferredMineralTypes: user.preferred_mineral_types || [],
      minimumPurchaseQuantity: user.minimum_purchase_quantity,
      requiredRegulations: user.required_regulations || [],
    };
    res.status(200).json(frontendUser);
  } catch (error) {
    next(error);
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApplicationError('User not authenticated.', 401);
    }
    const { error, value } = profileUpdateSchema.validate(req.body);
    if (error) {
      throw new ApplicationError(error.details[0].message, 400);
    }

    // Prepare updates object for the service layer, matching DB column names
    const updates: Partial<BackendUser> = {
      first_name: value.firstName,
      last_name: value.lastName,
      email: value.email,
      company_name: value.companyName, // Include companyName
      phone_number: value.phoneNumber, // Include phoneNumber
      location: value.location, // Include location
    };

    // Conditionally add buyer-specific fields if they exist in the validated value
    if (req.user.role === 'buyer') { // Assuming req.user has the role
        if (value.preferredMineralTypes !== undefined) {
            updates.preferred_mineral_types = value.preferredMineralTypes;
        }
        if (value.minimumPurchaseQuantity !== undefined) {
            updates.minimum_purchase_quantity = value.minimumPurchaseQuantity;
        }
        if (value.requiredRegulations !== undefined) {
            updates.required_regulations = value.requiredRegulations;
        }
    }

    const updatedUser = await userService.updateUserProfile(req.user.id, updates);

    // Map BackendUser to Frontend User for response
    const frontendUser = {
      id: updatedUser.id,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      email: updatedUser.email,
      role: updatedUser.role,
      emailVerified: updatedUser.email_verified,
      memberSince: updatedUser.created_at ? new Date(updatedUser.created_at).toLocaleDateString() : 'N/A',
      companyName: updatedUser.company_name,
      phoneNumber: updatedUser.phone_number,
      location: updatedUser.location,
      complianceStatus: updatedUser.compliance_status,
      preferredMineralTypes: updatedUser.preferred_mineral_types || [],
      minimumPurchaseQuantity: updatedUser.minimum_purchase_quantity,
      requiredRegulations: updatedUser.required_regulations || [],
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
      companyName: updatedUser.company_name,
      phoneNumber: updatedUser.phone_number,
      location: updatedUser.location,
      complianceStatus: updatedUser.compliance_status, // Include compliance status
      preferredMineralTypes: updatedUser.preferred_mineral_types || [],
      minimumPurchaseQuantity: updatedUser.minimum_purchase_quantity,
      requiredRegulations: updatedUser.required_regulations || [],
    };

    res.status(200).json({ message: `User ${userIdToUpdate} compliance status updated to ${status}.`, user: frontendUser });
  } catch (error) {
    next(error);
  }
};

// NEW: Admin-only endpoint to get all users
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userService.getAllUsers();
    // You might want to filter sensitive information like password_hash before sending
    const safeUsers = users.map(user => ({
      id: user.id,
      firstName: user.first_name, // Map to camelCase for frontend
      lastName: user.last_name,   // Map to camelCase for frontend
      email: user.email,
      role: user.role,
      emailVerified: user.email_verified,
      memberSince: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
      companyName: user.company_name, // NEW
      phoneNumber: user.phone_number, // NEW
      location: user.location, // NEW
      complianceStatus: user.compliance_status, // Include compliance status
      preferredMineralTypes: user.preferred_mineral_types || [], // NEW
      minimumPurchaseQuantity: user.minimum_purchase_quantity, // NEW
      requiredRegulations: user.required_regulations || [], // NEW
    }));
    res.status(200).json(safeUsers);
  } catch (error) {
    next(error);
  }
};
