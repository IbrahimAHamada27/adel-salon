export type ExpenseStatus = 'RECORDED' | 'VOIDED';

export type ExpensePaymentSource = 'CASH_DRAWER';

export interface LocalExpense {
  local_id: string;
  shift_local_id: string;
  amount: number;
  category: string;
  internal_note?: string | null;
  attachment_local_path?: string | null;
  payment_source: ExpensePaymentSource;
  status: ExpenseStatus;
  created_at: string;
  created_by_cashier_id: string;
}

export interface CreateExpensePayload {
  amount: number;
  category: string;
  internal_note?: string;
}
