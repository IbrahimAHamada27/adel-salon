import { AuthStatus, AuthResponse, User } from '@/types/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const authApi = {
  async getStatus(): Promise<AuthStatus> {
    const res = await fetch(`${API_BASE}/auth/status`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      throw new Error('فشل التحقق من حالة النظام');
    }
    return res.json();
  },

  async setupOwner(data: { name: string; username: string; email?: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/setup-owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'فشل إعداد حساب المالك');
    }
    return res.json();
  },

  async login(data: { username: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    }
    return res.json();
  },

  async getMe(token: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      throw new Error('جلسة الدخول غير صالحة');
    }
    return res.json();
  },

  async logout(token: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(3000),
      });
      return res.ok ? res.json() : { success: true };
    } catch {
      return { success: true };
    }
  },
};
