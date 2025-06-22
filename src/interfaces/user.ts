export type UserRole = 'buyer' | 'seller' | 'admin' | 'miner' | 'verifier';

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
