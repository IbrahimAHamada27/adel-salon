const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface PromotionItemInput {
  catalogItemId: string;
  quantity?: number;
  sortOrder?: number;
}

export interface CreatePromotionInput {
  name: string;
  description?: string;
  fixedPrice: number;
  status?: 'ACTIVE' | 'INACTIVE';
  startsAt?: string;
  endsAt?: string;
  sortOrder?: number;
  items: PromotionItemInput[];
}

export interface UpdatePromotionInput {
  name?: string;
  description?: string;
  fixedPrice?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  startsAt?: string;
  endsAt?: string;
  sortOrder?: number;
  items?: PromotionItemInput[];
}

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  fixedPrice: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  startsAt?: string;
  endsAt?: string;
  sortOrder: number;
  items: Array<{
    id: string;
    catalogItemId: string;
    catalogItemNameSnapshot: string;
    catalogItemType: string;
    quantity: number;
    sortOrder: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

class PromotionsApiService {
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

  async getPromotions(status?: string): Promise<Promotion[]> {
    const query = status ? `?status=${status}` : '';
    return this.fetchJson<Promotion[]>(`/promotions${query}`);
  }

  async getPromotion(id: string): Promise<Promotion> {
    return this.fetchJson<Promotion>(`/promotions/${id}`);
  }

  async createPromotion(input: CreatePromotionInput): Promise<Promotion> {
    return this.fetchJson<Promotion>('/promotions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updatePromotion(id: string, input: UpdatePromotionInput): Promise<Promotion> {
    return this.fetchJson<Promotion>(`/promotions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async archivePromotion(id: string): Promise<Promotion> {
    return this.fetchJson<Promotion>(`/promotions/${id}/archive`, {
      method: 'POST',
    });
  }

  async restorePromotion(id: string): Promise<Promotion> {
    return this.fetchJson<Promotion>(`/promotions/${id}/restore`, {
      method: 'POST',
    });
  }
}

export const promotionsApi = new PromotionsApiService();
