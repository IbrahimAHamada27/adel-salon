export type UserRole = 'OWNER' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  role: UserRole;
  is_active?: number;
}

export interface AuthStatus {
  hasOwner: boolean;
  isSetupRequired: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}
