const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface SystemSettings {
  owner: {
    id: string;
    name: string;
    username: string;
    email: string | null;
  };
  cashierAccount: {
    id: string;
    name: string;
    username: string;
    is_active: number;
    last_login_at: string | null;
  } | null;
  systemCounts: {
    services: number;
    products: number;
    barbers: number;
    promotions: number;
    customers: number;
    invoices: number;
  };
  version: string;
  databaseEngine: string;
  offlineSyncStatus: string;
}

export const settingsApi = {
  async getSettings(token: string): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب إعدادات النظام');
    return res.json();
  },

  async updateProfile(token: string, data: { name: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/settings/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'فشل تحديث البيانات الشخصية');
    }
    return res.json();
  },

  async changePassword(token: string, data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/admin/settings/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'فشل تغيير كلمة المرور');
    }
    return res.json();
  },
};
