const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface Shift {
  id: string;
  cashier_id: string;
  cashier_name?: string | null;
  status: 'OPEN' | 'CLOSED';
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  expected_cash: number;
  actual_cash: number | null;
  cash_difference: number;
  notes: string | null;
  created_at: string;
  total_sales?: number;
  cash_sales?: number;
  card_sales?: number;
  invoices_count?: number;
  total_expenses?: number;
}

export interface ShiftsResponse {
  shifts: Shift[];
  total: number;
  summary: {
    totalCount: number;
    openCount: number;
    closedCount: number;
  };
}

export const shiftsApi = {
  async getShifts(
    token: string,
    params?: { status?: string; startDate?: string; endDate?: string; limit?: number; offset?: number },
  ): Promise<ShiftsResponse> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));

    const res = await fetch(`${API_BASE}/admin/shifts?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب قائمة الورديات');
    return res.json();
  },

  async getShift(token: string, id: string): Promise<Shift> {
    const res = await fetch(`${API_BASE}/admin/shifts/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب تفاصيل الوردية');
    return res.json();
  },
};
