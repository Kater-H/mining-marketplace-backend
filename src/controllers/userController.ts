    // src/controllers/userController.ts
    import { Request, Response, NextFunction } from 'express';
    import { UserService } from '../services/userService.js';
    import { UserRole, UserRegistrationData } from '../interfaces/user.js'; // Ensure UserRegistrationData is imported

    const userService = new UserService();

    // Register a new user
    export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { firstName, lastName, email, password, role } = req.body;
        // Call service with individual fields
        const user = await userService.registerUser(firstName, lastName, email, password, role as UserRole);
        // Frontend expects camelCase, so map here if service returns snake_case
        res.status(201).json({
          message: 'User registered successfully. Please verify your email.',
          user: {
            id: user.id,
            firstName: user.first_name, // Map to camelCase for frontend
            lastName: user.last_name,   // Map to camelCase for frontend
            email: user.email,
            role: user.role,
            emailVerified: user.email_verified, // Map to camelCase for frontend
            memberSince: user.member_since ? new Date(user.member_since).toLocaleDateString() : undefined, // Format date for frontend
            // Add other optional fields if needed, mapping to camelCase
            companyName: user.company_name,
            phoneNumber: user.phone_number,
          }
        });
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
        // Map user object from service (snake_case) to frontend's camelCase User interface
        const userForFrontend = {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role,
          emailVerified: user.email_verified,
          memberSince: user.member_since ? new Date(user.member_since).toLocaleDateString() : undefined,
          companyName: user.company_name,
          phoneNumber: user.phone_number,
        };
        res.status(200).json({ message: 'Login successful', user: userForFrontend, token });
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
        // Map userProfile from service (snake_case) to frontend's camelCase User interface
        const userProfileForFrontend = {
          id: userProfile.id,
          firstName: userProfile.first_name,
          lastName: userProfile.last_name,
          email: userProfile.email,
          role: userProfile.role,
          emailVerified: userProfile.email_verified,
          memberSince: userProfile.member_since ? new Date(userProfile.member_since).toLocaleDateString() : undefined,
          companyName: userProfile.company_name,
          phoneNumber: userProfile.phone_number,
        };
        res.status(200).json(userProfileForFrontend);
      } catch (error) {
        console.error('Error getting user profile:', error); // Keep for debugging specific controller errors
        next(error); // Pass error to the error handling middleware
      }
    };

    // Update user profile
    export const updateUserProfile = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user!.id; // User ID from authenticated token
        const { firstName, lastName, email } = req.body; // Fields allowed to be updated from frontend (camelCase)
        const updatedUser = await userService.updateUserProfile(userId, { firstName, lastName, email });
        if (!updatedUser) {
          return res.status(404).json({ message: 'User not found or no changes applied.' });
        }
        // Map updatedUser from service (snake_case) to frontend's camelCase User interface
        const updatedUserForFrontend = {
          id: updatedUser.id,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          email: updatedUser.email,
          role: updatedUser.role,
          emailVerified: updatedUser.email_verified,
          memberSince: updatedUser.member_since ? new Date(updatedUser.member_since).toLocaleDateString() : undefined,
          companyName: updatedUser.company_name,
          phoneNumber: updatedUser.phone_number,
        };
        res.status(200).json({ message: 'User profile updated successfully', user: updatedUserForFrontend });
      } catch (error) {
        console.error('Error updating user profile:', error); // Keep for debugging specific controller errors
        next(error); // Pass error to the error handling middleware
      }
    };
    