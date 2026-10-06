import { LocalCustomer } from './customer';

export type InvoiceStatus = 'DRAFT' | 'SUSPENDED' | 'AWAITING_PAYMENT' | 'PAID' | 'CANCELLED' | 'REFUNDED';

export type ItemType = 'SERVICE' | 'PRODUCT';

export type PaymentMethod = 'CASH' | 'INSTAPAY' | 'WALLET' | 'CARD';

export type AdjustmentType =
  | 'MANUAL_PRICE_OVERRIDE'
  | 'FIXED_DISCOUNT'
  | 'PERCENTAGE_DISCOUNT'
  | 'FIXED_SURCHARGE'
  | 'PERCENTAGE_SURCHARGE';

export interface LocalLineAdjustment {
  local_id: string;
  invoice_line_local_id: string;
  adjustment_type: AdjustmentType;
  original_price_before: number;
  resulting_price_after: number;
  input_value: number;
  reason?: string | null;
  performed_by_cashier_id: string;
  created_at: string;
}

export interface LocalInvoiceLine {
  local_id: string;
  invoice_local_id: string;
  catalog_item_id: string;
  item_type: ItemType;
  item_name_snapshot: string;
  original_unit_price_snapshot: number;
  quantity: number;
  assigned_employee_id?: string | null;
  assigned_employee_name_snapshot?: string | null;
  internal_note?: string | null;
  line_subtotal: number;
  line_final_total: number;
  created_at: string;
  updated_at: string;
  active_adjustment?: LocalLineAdjustment | null;
  parent_promotion_local_id?: string | null;
  promotion_name_snapshot?: string | null;
}

export interface LocalPayment {
  local_id: string;
  invoice_local_id: string;
  payment_method: PaymentMethod;
  amount: number;
  cash_received_amount?: number | null;
  change_amount?: number | null;
  reference_note?: string | null;
  created_at: string;
  created_by_cashier_id: string;
}

export interface LocalPaymentInput {
  payment_method: PaymentMethod;
  amount: number;
  cash_received_amount?: number;
  change_amount?: number;
  reference_note?: string;
}

export interface LocalInvoice {
  local_id: string;
  invoice_number_local: number;
  status: InvoiceStatus;
  customer_local_id?: string | null;
  customer?: LocalCustomer | null;
  cashier_user_id: string;
  shift_local_id?: string | null;
  subtotal: number;
  total_discount: number;
  total_surcharge: number;
  total: number;
  tip_amount?: number | null;
  tip_recipient_employee_id?: string | null;
  tip_recipient_employee_name_snapshot?: string | null;
  internal_note?: string | null;
  paid_at?: string | null;
  refunded_at?: string | null;
  refund_reason?: string | null;
  refunded_by_cashier_id?: string | null;
  created_at: string;
  updated_at: string;
  lines: LocalInvoiceLine[];
  payments: LocalPayment[];
}

export interface ApplyAdjustmentPayload {
  line_id: string;
  adjustment_type: AdjustmentType;
  input_value: number;
  reason?: string;
}
