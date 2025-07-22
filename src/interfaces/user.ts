// src/interfaces/user.ts

// Frontend User interface - uses camelCase for consistency with React component props
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'buyer' | 'miner' | 'admin';
  emailVerified: boolean;
  memberSince: string; // Assuming a string date like "January 15, 2024"
  companyName?: string;
  phoneNumber?: string;
  complianceStatus: 'pending' | 'compliant' | 'non_compliant'; 
}

// Backend User interface (for data coming from the database/API)
export interface BackendUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string; 
  role: 'buyer' | 'miner' | 'admin';
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  company_name?: string; // <-- ENSURE THIS IS PRESENT AND OPTIONAL
  phone_number?: string; // <-- ENSURE THIS IS PRESENT AND OPTIONAL
  compliance_status: 'pending' | 'compliant' | 'non_compliant';
}
