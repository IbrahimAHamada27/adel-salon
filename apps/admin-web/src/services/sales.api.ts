const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface InvoiceLine {
  id: string;
  item_name_snapshot: string;
  item_type: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  barber_employee_id: string | null;
  barber_name?: string | null;
  parent_promotion_id: string | null;
}

export interface Invoice {
  id: string;
  shift_id: string | null;
  cashier_id: string;
  cashier_name?: string | null;
  customer_id: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  invoice_number: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  status: string;
  notes: string | null;
  created_at: string;
  lines: InvoiceLine[];
}

export interface SalesResponse {
  invoices: Invoice[];
  total: number;
  summary: {
    totalSales: number;
    totalCount: number;
    totalDiscount: number;
  };
}

export const salesApi = {
  async getInvoices(
    token: string,
    params?: { startDate?: string; endDate?: string; status?: string; paymentMethod?: string; search?: string; limit?: number; offset?: number },
  ): Promise<SalesResponse> {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.status) query.append('status', params.status);
    if (params?.paymentMethod) query.append('paymentMethod', params.paymentMethod);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));

    const res = await fetch(`${API_BASE}/admin/sales/invoices?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب قائمة الفواتير');
    return res.json();
  },

  async getInvoice(token: string, id: string): Promise<Invoice> {
    const res = await fetch(`${API_BASE}/admin/sales/invoices/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب تفاصيل الفاتورة');
    return res.json();
  },
};
