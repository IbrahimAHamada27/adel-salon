const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface AuditEvent {
  id: string;
  actor_user_id: string | null;
  actor_name?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before_data: any;
  after_data: any;
  created_at: string;
}

export interface AuditResponse {
  events: AuditEvent[];
  total: number;
}

export const auditApi = {
  async getEvents(
    token: string,
    params?: { entityType?: string; action?: string; startDate?: string; endDate?: string; search?: string; limit?: number; offset?: number },
  ): Promise<AuditResponse> {
    const query = new URLSearchParams();
    if (params?.entityType) query.append('entityType', params.entityType);
    if (params?.action) query.append('action', params.action);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));

    const res = await fetch(`${API_BASE}/admin/audit-log?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('فشل جلب سجلات التدقيق');
    return res.json();
  },
};
