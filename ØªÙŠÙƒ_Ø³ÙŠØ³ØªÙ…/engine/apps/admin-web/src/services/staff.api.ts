const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface Employee {
  id: string;
  name: string;
  phone: string | null;
  role_title: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  sort_order: number;
  created_at: string;
}

export interface CashierAccount {
  id: string;
  name: string;
  username: string;
  is_active: number;
  last_login_at: string | null;
}

export const staffApi = {
  async getEmployees(token: string, includeArchived = true): Promise<Employee[]> {
    const res = await fetch(`${API_BASE}/employees?includeArchived=${includeArchived}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب قائمة الموظفين');
    return res.json();
  },

  async createEmployee(token: string, data: { name: string; phone?: string; roleTitle?: string }): Promise<Employee> {
    const res = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'فشل إضافة الموظف');
    }
    return res.json();
  },

  async updateEmployee(token: string, id: string, data: { name?: string; phone?: string; roleTitle?: string; status?: string }): Promise<Employee> {
    const res = await fetch(`${API_BASE}/employees/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'فشل تحديث بيانات الموظف');
    }
    return res.json();
  },

  async archiveEmployee(token: string, id: string): Promise<Employee> {
    const res = await fetch(`${API_BASE}/employees/${id}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('فشل أرشفة الموظف');
    return res.json();
  },

  async restoreEmployee(token: string, id: string): Promise<Employee> {
    const res = await fetch(`${API_BASE}/employees/${id}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('فشل استعادة الموظف');
    return res.json();
  },

  async reorderEmployee(token: string, id: string, direction: 'UP' | 'DOWN'): Promise<Employee> {
    const res = await fetch(`${API_BASE}/employees/${id}/reorder`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) throw new Error('فشل تغيير ترتيب الموظف');
    return res.json();
  },

  // --- Cashier Account Management ---
  async getCashierAccount(token: string): Promise<{ exists: boolean; cashier: CashierAccount | null }> {
    const res = await fetch(`${API_BASE}/users/cashier`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب بيانات حساب الكاشير');
    return res.json();
  },

  async manageCashierAccount(
    token: string,
    data: { name: string; username: string; password?: string; isActive?: boolean },
  ): Promise<{ message: string; cashier: CashierAccount }> {
    const res = await fetch(`${API_BASE}/users/cashier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'فشل حفظ إعدادات حساب الكاشير');
    }
    return res.json();
  },
};
