const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface Customer {
  id: string;
  full_name: string;
  phone_number: string | null;
  birth_date: string | null;
  internal_note: string | null;
  created_at: string;
  invoices_count?: number;
  total_spent?: number;
  last_visit_at?: string | null;
}

export interface CustomerHistory {
  invoices: any[];
  bookings: any[];
}

export const customersApi = {
  async getCustomers(token: string, params?: { search?: string; limit?: number; offset?: number }): Promise<{ customers: Customer[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));

    const res = await fetch(`${API_BASE}/admin/customers?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب قائمة العملاء');
    return res.json();
  },

  async getCustomer(token: string, id: string): Promise<Customer> {
    const res = await fetch(`${API_BASE}/admin/customers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب تفاصيل العميل');
    return res.json();
  },

  async getCustomerHistory(token: string, id: string): Promise<CustomerHistory> {
    const res = await fetch(`${API_BASE}/admin/customers/${id}/history`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب سجل زيارات العميل');
    return res.json();
  },

  async createCustomer(token: string, data: { fullName: string; phoneNumber?: string; birthDate?: string; internalNote?: string }): Promise<Customer> {
    const res = await fetch(`${API_BASE}/admin/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'فشل إضافة العميل');
    }
    return res.json();
  },

  async updateCustomer(token: string, id: string, data: { fullName?: string; phoneNumber?: string; birthDate?: string; internalNote?: string }): Promise<Customer> {
    const res = await fetch(`${API_BASE}/admin/customers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'فشل تعديل بيانات العميل');
    }
    return res.json();
  },
};
