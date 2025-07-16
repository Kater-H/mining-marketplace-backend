// src/interfaces/user.ts
// UPDATED: Added 'seller' to UserRole
export type UserRole = 'buyer' | 'miner' | 'admin' | 'seller';

export interface UserRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  companyName?: string;
  phoneNumber?: string;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  role: UserRole;
  email_verified: boolean;
  verification_token?: string;
  created_at: string;
  updated_at: string;
  company_name?: string;
  phone_number?: string;
}

export type UserLoginResponse = Omit<User, 'password' | 'verification_token'>;
