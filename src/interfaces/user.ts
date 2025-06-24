export type UserRole = 'buyer' | 'seller' | 'admin' | 'miner' | 'verifier'; // Changed from 'enum' back to 'type'

export interface User {
  id: number;
  email: string;
  password: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone_number?: string;
  email_verified: boolean;
  verification_token?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserRegistrationData {
  email: string;
  password: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone_number?: string;
}

export interface UserLoginResponse {
  user: Omit<User, 'password' | 'verification_token'>;
  token: string;
}

// You can remove this dummy export now as it's not strictly necessary with type exports.
// If you want to keep it just in case, it doesn't hurt, but for now, let's remove it for clarity.
// export const __esModule = true;
