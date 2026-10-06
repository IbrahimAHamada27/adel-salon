export interface LocalPromotionItem {
  id: string;
  promotion_id: string;
  catalog_item_id: string;
  catalog_item_name_snapshot: string;
  catalog_item_type: 'SERVICE' | 'PRODUCT';
  quantity: number;
  sort_order: number;
  catalog_item_base_price?: number;
}

export interface LocalPromotion {
  id: string;
  name: string;
  description?: string | null;
  fixed_price: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  starts_at?: string | null;
  ends_at?: string | null;
  sort_order: number;
  items: LocalPromotionItem[];
  original_total_price?: number;
  savings_amount?: number;
}
