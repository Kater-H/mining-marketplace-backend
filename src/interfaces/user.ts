// src/interfaces/user.ts
export type UserRole = 'buyer' | 'miner' | 'admin';

export interface UserRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  companyName?: string; // Optional on frontend
  phoneNumber?: string; // Optional on frontend
}

export interface User {
  id: number;
  first_name: string; // Matches DB column name
  last_name: string;  // Matches DB column name
  email: string;
  password?: string; // Only present for registration/login, not stored/returned
  role: UserRole;
  email_verified: boolean;
  verification_token?: string; // For email verification
  created_at: string; // Changed to string, as PG typically returns ISO strings
  updated_at: string; // Changed to string
  company_name?: string; // Still optional in interface, but backend won't query it
  phone_number?: string; // Still optional in interface, but backend won't query it
}

// This interface is for the user object returned *after* login/profile fetch,
// which typically omits sensitive fields like password and verification token.
export type UserLoginResponse = Omit<User, 'password' | 'verification_token'>;
