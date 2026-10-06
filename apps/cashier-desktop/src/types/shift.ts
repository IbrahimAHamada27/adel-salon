export type ShiftStatus = 'OPEN' | 'CLOSING' | 'CLOSED_PENDING_SYNC';

export interface LocalShift {
  local_id: string;
  cashier_user_id: string;
  cashier_display_name_snapshot: string;
  status: ShiftStatus;
  opened_at: string;
  closed_at?: string | null;
  opening_cash_amount: number;
  expected_cash_amount: number;
  actual_cash_amount?: number | null;
  cash_difference_amount?: number | null;
  closing_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BarberShiftPerformance {
  employee_id: string;
  employee_name: string;
  services_count: number;
  total_sales: number;
  total_tips: number;
}

export interface ShiftSummary {
  shift_id: string;
  opening_cash: number;
  cash_sales: number;
  non_cash_sales: number;
  total_sales: number;
  cash_expenses: number;
  expected_cash: number;
  paid_invoices_count: number;
  total_tips: number;
  barbers_performance: BarberShiftPerformance[];
}
