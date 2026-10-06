export interface LocalCategory {
  id: string;
  name: string;
  color_code?: string | null;
  icon?: string | null;
  sort_order: number;
}

export interface LocalGroup {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
}

export interface LocalCatalogItem {
  id: string;
  group_id: string;
  type: 'SERVICE' | 'PRODUCT';
  name: string;
  base_price: number;
  sku?: string | null;
  sort_order: number;
  internal_note?: string | null;
}

export interface LocalCatalogData {
  categories: LocalCategory[];
  groups: LocalGroup[];
  items: LocalCatalogItem[];
  last_synced_at?: string | null;
  version?: number | null;
}

export interface SyncResult {
  success: boolean;
  categories_count: number;
  groups_count: number;
  items_count: number;
  employees_count: number;
  synced_at: string;
  message: string;
}
