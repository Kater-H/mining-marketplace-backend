    // src/types/express.d.ts
    // This file extends Express's Request interface to include custom properties.

    // Import the Request type from Express
    import { Request } from 'express';
    import { UserRole } from '../interfaces/user'; // Import UserRole from your user interface

    // Declare the Express namespace to augment its types
    declare global {
      namespace Express {
        // Extend the Request interface
        interface Request {
          // Define the 'user' property that your authentication middleware attaches.
          // It should match the structure of the payload you put in the JWT.
          user?: {
            id: number;
            email: string;
            roles: UserRole[]; // Assuming roles is an array of UserRole
          };
        }
      }
    }
    