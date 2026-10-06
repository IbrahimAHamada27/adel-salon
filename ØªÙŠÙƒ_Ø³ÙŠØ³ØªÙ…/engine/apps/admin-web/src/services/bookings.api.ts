const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface BookingItemInput {
  catalogItemId: string;
  itemNameSnapshot?: string;
  itemType?: 'SERVICE' | 'PRODUCT';
  quantity?: number;
  sortOrder?: number;
}

export interface CreateBookingInput {
  customerId?: string;
  guestName?: string;
  guestPhone?: string;
  scheduledAt: string;
  preferredEmployeeId?: string;
  internalNote?: string;
  items?: BookingItemInput[];
}

export interface UpdateBookingInput {
  customerId?: string;
  guestName?: string;
  guestPhone?: string;
  scheduledAt?: string;
  preferredEmployeeId?: string;
  internalNote?: string;
  status?: 'CONFIRMED' | 'ARRIVED' | 'NO_SHOW' | 'CANCELLED' | 'CONVERTED_TO_INVOICE';
  items?: BookingItemInput[];
}

export interface Booking {
  id: string;
  customerId?: string;
  customerName?: string;
  guestName?: string;
  guestPhone?: string;
  scheduledAt: string;
  status: 'CONFIRMED' | 'ARRIVED' | 'NO_SHOW' | 'CANCELLED' | 'CONVERTED_TO_INVOICE';
  preferredEmployeeId?: string;
  preferredEmployeeName?: string;
  internalNote?: string;
  createdByUserId: string;
  createdFrom: string;
  convertedInvoiceId?: string;
  items?: Array<{
    id: string;
    catalogItemId: string;
    itemNameSnapshot: string;
    itemType: string;
    quantity: number;
    sortOrder: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

class BookingsApiService {
  private getHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tech_auth_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `خطأ في الاتصال بالسيرفر (${res.status})`);
    }

    return res.json();
  }

  async getBookings(filters?: { status?: string; startDate?: string; endDate?: string }): Promise<Booking[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.fetchJson<Booking[]>(`/bookings${query}`);
  }

  async getBooking(id: string): Promise<Booking> {
    return this.fetchJson<Booking>(`/bookings/${id}`);
  }

  async createBooking(input: CreateBookingInput): Promise<Booking> {
    return this.fetchJson<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateBooking(id: string, input: UpdateBookingInput): Promise<Booking> {
    return this.fetchJson<Booking>(`/bookings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async updateStatus(id: string, status: string, reason?: string): Promise<Booking> {
    return this.fetchJson<Booking>(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  }
}

export const bookingsApi = new BookingsApiService();
