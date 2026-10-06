const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface FinancialReport {
  revenue: number;
  subtotal: number;
  discounts: number;
  cashRevenue: number;
  cardRevenue: number;
  invoicesCount: number;
  expenses: number;
  expensesCount: number;
  netIncome: number;
}

export interface BarberReportItem {
  barber_id: string;
  barber_name: string;
  role_title: string | null;
  employee_status: string;
  services_performed: number;
  total_service_revenue: number;
}

export interface TopServiceItem {
  item_name: string;
  item_type: string;
  times_sold: number;
  total_quantity: number;
  total_revenue: number;
}

export interface PromotionReportItem {
  promotion_id: string;
  promotion_name: string;
  fixed_price: number;
  sales_count: number;
  total_revenue: number;
}

export interface BookingsReport {
  summary: {
    total_bookings: number;
    confirmed_count: number;
    arrived_count: number;
    no_show_count: number;
    cancelled_count: number;
    converted_count: number;
  };
  byBarber: Array<{
    barber_id: string;
    barber_name: string;
    bookings_count: number;
  }>;
}

export const reportsApi = {
  async getFinancial(token: string, params?: { startDate?: string; endDate?: string }): Promise<FinancialReport> {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const res = await fetch(`${API_BASE}/admin/reports/financial?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب التقرير المالي');
    return res.json();
  },

  async getBarbers(token: string, params?: { startDate?: string; endDate?: string }): Promise<BarberReportItem[]> {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const res = await fetch(`${API_BASE}/admin/reports/barbers?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب تقرير أداء الحلاقين');
    return res.json();
  },

  async getTopServices(token: string, params?: { startDate?: string; endDate?: string }): Promise<TopServiceItem[]> {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const res = await fetch(`${API_BASE}/admin/reports/top-services?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب تقرير أكثر الخدمات مبيعاً');
    return res.json();
  },

  async getPromotions(token: string, params?: { startDate?: string; endDate?: string }): Promise<PromotionReportItem[]> {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const res = await fetch(`${API_BASE}/admin/reports/promotions?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب تقرير مبيعات العروض والباقات');
    return res.json();
  },

  async getBookings(token: string, params?: { startDate?: string; endDate?: string }): Promise<BookingsReport> {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const res = await fetch(`${API_BASE}/admin/reports/bookings?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب تقرير الحجوزات');
    return res.json();
  },

  getExportUrl(type: 'sales' | 'expenses' | 'shifts', params?: { startDate?: string; endDate?: string }): string {
    const query = new URLSearchParams({ type });
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    return `${API_BASE}/admin/reports/export/excel?${query.toString()}`;
  },
};
