export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface Employee {
  id: string;
  name: string;
  phone?: string | null;
  role_title?: string | null;
  status: EmployeeStatus;
  sort_order: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}
