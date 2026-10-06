export interface LocalCustomer {
  local_id: string;
  full_name: string;
  phone_number?: string | null;
  birth_date?: string | null;
  internal_note?: string | null;
  created_at: string;
  updated_at: string;
  created_by_cashier_id: string;
}

export interface CreateCustomerPayload {
  full_name: string;
  phone_number?: string;
  birth_date?: string;
  internal_note?: string;
}
