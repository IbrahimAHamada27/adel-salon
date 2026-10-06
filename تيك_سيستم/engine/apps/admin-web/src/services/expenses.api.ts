const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface Expense {
  id: string;
  shift_id: string | null;
  cashier_id: string;
  cashier_name?: string | null;
  category: string;
  amount: number;
  description: string | null;
  created_at: string;
}

export interface ExpensesResponse {
  expenses: Expense[];
  total: number;
  summary: {
    totalSpent: number;
    totalCount: number;
    categoriesCount: number;
  };
}

export const expensesApi = {
  async getExpenses(
    token: string,
    params?: { category?: string; startDate?: string; endDate?: string; search?: string; limit?: number; offset?: number },
  ): Promise<ExpensesResponse> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));

    const res = await fetch(`${API_BASE}/admin/expenses?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب قائمة المصروفات');
    return res.json();
  },

  async getCategories(token: string): Promise<string[]> {
    const res = await fetch(`${API_BASE}/admin/expenses/categories`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب تصنيفات المصروفات');
    return res.json();
  },

  async createExpense(
    token: string,
    data: { category: string; amount: number; description?: string },
  ): Promise<Expense> {
    const res = await fetch(`${API_BASE}/admin/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'فشل تسجيل المصروف');
    }
    return res.json();
  },
};
