export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: 'CASHIER' | 'OWNER';
}

export interface LocalSession {
  cashier_id: string;
  cashier_name: string;
  cashier_username: string;
  token: string;
  last_active: string;
}

export interface AuthResponse {
  success: boolean;
  user?: SessionUser;
  token?: string;
  message?: string;
}
