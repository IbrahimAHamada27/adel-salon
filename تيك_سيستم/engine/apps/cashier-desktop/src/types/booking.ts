export type BookingStatus =
  | 'CONFIRMED'
  | 'ARRIVED'
  | 'NO_SHOW'
  | 'CANCELLED'
  | 'CONVERTED_TO_INVOICE';

export interface LocalBookingItem {
  id: string;
  booking_id: string;
  catalog_item_id?: string | null;
  promotion_id?: string | null;
  item_name_snapshot: string;
  item_type: 'SERVICE' | 'PRODUCT' | 'PROMOTION';
  quantity: number;
  sort_order: number;
}

export interface LocalBooking {
  local_id: string;
  customer_local_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  display_client_name: string;
  display_client_phone?: string | null;
  scheduled_at: string;
  status: BookingStatus;
  preferred_employee_id?: string | null;
  preferred_employee_name?: string | null;
  has_conflict?: boolean;
  internal_note?: string | null;
  converted_invoice_id?: string | null;
  created_at: string;
  updated_at: string;
  items: LocalBookingItem[];
}

export interface CreateLocalBookingPayload {
  customer_local_id?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  scheduled_at: string;
  preferred_employee_id?: string | null;
  internal_note?: string | null;
  items?: Array<{
    catalog_item_id?: string;
    promotion_id?: string;
    item_name_snapshot: string;
    item_type: 'SERVICE' | 'PRODUCT' | 'PROMOTION';
    quantity?: number;
  }>;
}
