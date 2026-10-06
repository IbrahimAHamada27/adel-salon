import {
  Category,
  Group,
  CatalogItem,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateGroupInput,
  UpdateGroupInput,
  CreateServiceInput,
  CreateProductInput,
  UpdateCatalogItemInput,
} from '@/types/catalog';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class CatalogApiService {
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

  // --- Categories ---
  async getCategories(): Promise<Category[]> {
    return this.fetchJson<Category[]>('/catalog/categories');
  }

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    return this.fetchJson<Category>('/catalog/categories', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
    return this.fetchJson<Category>(`/catalog/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async archiveCategory(id: string): Promise<Category> {
    return this.fetchJson<Category>(`/catalog/categories/${id}/archive`, {
      method: 'POST',
    });
  }

  async restoreCategory(id: string): Promise<Category> {
    return this.fetchJson<Category>(`/catalog/categories/${id}/restore`, {
      method: 'POST',
    });
  }

  async reorderCategory(id: string, direction: 'UP' | 'DOWN'): Promise<Category[]> {
    return this.fetchJson<Category[]>(`/catalog/categories/${id}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    });
  }

  // --- Groups ---
  async getGroupsByCategory(categoryId: string): Promise<Group[]> {
    return this.fetchJson<Group[]>(`/catalog/categories/${categoryId}/groups`);
  }

  async createGroup(input: CreateGroupInput): Promise<Group> {
    return this.fetchJson<Group>('/catalog/groups', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateGroup(id: string, input: UpdateGroupInput): Promise<Group> {
    return this.fetchJson<Group>(`/catalog/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async archiveGroup(id: string): Promise<Group> {
    return this.fetchJson<Group>(`/catalog/groups/${id}/archive`, {
      method: 'POST',
    });
  }

  async restoreGroup(id: string): Promise<Group> {
    return this.fetchJson<Group>(`/catalog/groups/${id}/restore`, {
      method: 'POST',
    });
  }

  async reorderGroup(id: string, direction: 'UP' | 'DOWN'): Promise<Group[]> {
    return this.fetchJson<Group[]>(`/catalog/groups/${id}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    });
  }

  // --- Catalog Items ---
  async getItems(): Promise<CatalogItem[]> {
    return this.fetchJson<CatalogItem[]>('/catalog/items');
  }

  async getItemsByGroup(groupId: string): Promise<CatalogItem[]> {
    return this.fetchJson<CatalogItem[]>(`/catalog/groups/${groupId}/items`);
  }

  async createService(input: CreateServiceInput): Promise<CatalogItem> {
    return this.fetchJson<CatalogItem>('/catalog/items/service', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async createProduct(input: CreateProductInput): Promise<CatalogItem> {
    return this.fetchJson<CatalogItem>('/catalog/items/product', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateItem(id: string, input: UpdateCatalogItemInput): Promise<CatalogItem> {
    return this.fetchJson<CatalogItem>(`/catalog/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async archiveItem(id: string): Promise<CatalogItem> {
    return this.fetchJson<CatalogItem>(`/catalog/items/${id}/archive`, {
      method: 'POST',
    });
  }

  async restoreItem(id: string): Promise<CatalogItem> {
    return this.fetchJson<CatalogItem>(`/catalog/items/${id}/restore`, {
      method: 'POST',
    });
  }

  async reorderItem(id: string, direction: 'UP' | 'DOWN'): Promise<CatalogItem[]> {
    return this.fetchJson<CatalogItem[]>(`/catalog/items/${id}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    });
  }
}

export const catalogApi = new CatalogApiService();
