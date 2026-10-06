export type UserRole = 'OWNER' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  password_hash: string;
  role: UserRole;
  is_active: number;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type SafeUser = Omit<User, 'password_hash'>;

