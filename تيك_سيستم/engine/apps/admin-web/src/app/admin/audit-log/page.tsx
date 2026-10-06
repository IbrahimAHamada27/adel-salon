'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auditApi, AuditEvent } from '@/services/audit.api';

export default function AuditLogPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Event for details modal
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const loadAuditLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await auditApi.getEvents(token, {
        action: action || undefined,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 100,
      });
      setEvents(data.events || []);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل سجل التدقيق');
    } finally {
      setLoading(false);
    }
  }, [token, action, search, startDate, endDate]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const formatActionName = (act: string) => {
    if (act === 'OPEN_SHIFT') {
      return { label: '🟢 فتح وردية', badgeClass: 'badge-emerald', color: '#10b981' };
    }
    if (act === 'CLOSE_SHIFT') {
      return { label: '🔴 إغلاق وردية', badgeClass: 'badge-indigo', color: '#6366f1' };
    }
    return { label: act, badgeClass: 'badge-slate', color: '#94a3b8' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛡️</span> سجل تدقيق الورديات (Audit Log)
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            سجل أمني غير قابل للتعديل يوثق عمليات فتح الورديات وإغلاقها وتسليم الخزينة بدقة.
          </p>
        </div>
        <button
          onClick={loadAuditLogs}
          disabled={loading}
          className="btn btn-secondary btn-sm"
        >
          <span>🔄</span> {loading ? 'جاري التحديث...' : 'تحديث السجل'}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          {/* Search Input */}
          <div style={{ position: 'relative', width: '240px' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم الكاشير أو المعرف..."
              className="form-input"
              style={{ paddingRight: '32px' }}
            />
            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>🔍</span>
          </div>

          {/* Action Filter */}
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="form-select"
            style={{ width: '180px' }}
          >
            <option value="">جميع الأحداث (فتح وإغلاق)</option>
            <option value="OPEN_SHIFT">🟢 فتح وردية (Open Shift)</option>
            <option value="CLOSE_SHIFT">🔴 إغلاق وردية (Close Shift)</option>
          </select>
        </div>

        {/* Date Filter */}
        <div className="filter-group">
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>من:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="form-input"
            style={{ width: '135px' }}
          />
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>إلى:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="form-input"
            style={{ width: '135px' }}
          />
          {(startDate || endDate || action || search) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setAction('');
                setSearch('');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>الوقت والتاريخ</th>
                <th>الكاشير (المستخدم)</th>
                <th>نوع الحدث</th>
                <th>معرف الوردية</th>
                <th>الملخص المالي</th>
                <th style={{ textAlign: 'center' }}>التفاصيل الكاملة</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    جاري تحميل سجلات فتح وإغلاق الورديات...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    لا توجد أحداث مسجلة لفتح أو إغلاق الورديات حتى الآن.
                  </td>
                </tr>
              ) : (
                events.map((evt) => {
                  const actBadge = formatActionName(evt.action);
                  const after = evt.after_data || {};
                  return (
                    <tr key={evt.id}>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(evt.created_at).toLocaleString('ar-EG')}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {evt.actor_name || (evt.actor_user_id ? evt.actor_user_id.slice(0, 8) : 'الكاشير')}
                      </td>
                      <td>
                        <span className={`badge ${actBadge.badgeClass}`}>
                          {actBadge.label}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
                        {evt.entity_id || after.shiftId || '—'}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        {evt.action === 'OPEN_SHIFT' ? (
                          <span>عهدة الافتتاح: <strong>{Number(after.openingBalance || 0).toLocaleString()} ج.م</strong></span>
                        ) : (
                          <span>
                            الفعلي: <strong>{Number(after.actualCash || 0).toLocaleString()} ج.م</strong> | الفرق:{' '}
                            <strong style={{ color: Number(after.cashDifference || 0) < 0 ? '#ef4444' : Number(after.cashDifference || 0) > 0 ? '#10b981' : '#94a3b8' }}>
                              {Number(after.cashDifference || 0) > 0 ? `+${after.cashDifference}` : after.cashDifference || 0} ج.م
                            </strong>
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedEvent(evt)}
                          className="btn btn-secondary btn-sm"
                        >
                          عرض تفاصيل الوردية
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift Event Details Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🛡️</span> {selectedEvent.action === 'OPEN_SHIFT' ? 'تفاصيل فتح الوردية' : 'تفاصيل إغلاق الوردية ومطابقة الخزينة'}
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            {/* Shift Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '0.85rem' }}>
              <div style={{ backgroundColor: '#070d18', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>نوع الإجراء:</span>
                <span style={{ fontWeight: 700, color: selectedEvent.action === 'OPEN_SHIFT' ? '#10b981' : '#6366f1' }}>
                  {selectedEvent.action === 'OPEN_SHIFT' ? '🟢 فتح وردية جديدة' : '🔴 إغلاق وردية ومطابقة الدرج'}
                </span>
              </div>

              <div style={{ backgroundColor: '#070d18', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>الكاشير المسؤول:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedEvent.actor_name || selectedEvent.actor_user_id || 'الكاشير'}
                </span>
              </div>

              <div style={{ backgroundColor: '#070d18', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>معرف الوردية:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  {selectedEvent.entity_id || selectedEvent.after_data?.shiftId || '—'}
                </span>
              </div>

              <div style={{ backgroundColor: '#070d18', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>تاريخ وتوقيت التسجيل:</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {new Date(selectedEvent.created_at).toLocaleString('ar-EG')}
                </span>
              </div>
            </div>

            {/* Financial Data Summary */}
            {selectedEvent.after_data && (
              <div style={{ backgroundColor: '#070d18', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '6px' }}>
                  💰 البيانات المالية للوردية:
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>عهدة البداية (كاش الافتتاح): </span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {Number(selectedEvent.after_data.openingBalance || 0).toLocaleString()} ج.م
                    </strong>
                  </div>

                  {selectedEvent.action === 'CLOSE_SHIFT' && (
                    <>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>الكاش المتوقع في الدرج: </span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {Number(selectedEvent.after_data.expectedCash || 0).toLocaleString()} ج.م
                        </strong>
                      </div>

                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>الكاش الفعلي المحسوب: </span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {Number(selectedEvent.after_data.actualCash || 0).toLocaleString()} ج.م
                        </strong>
                      </div>

                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>فارق الخزنة (عجز/زيادة): </span>
                        <strong style={{ color: Number(selectedEvent.after_data.cashDifference || 0) < 0 ? '#ef4444' : Number(selectedEvent.after_data.cashDifference || 0) > 0 ? '#10b981' : '#94a3b8' }}>
                          {Number(selectedEvent.after_data.cashDifference || 0) > 0
                            ? `+${selectedEvent.after_data.cashDifference}`
                            : selectedEvent.after_data.cashDifference || 0}{' '}
                          ج.م
                        </strong>
                      </div>
                    </>
                  )}
                </div>

                {selectedEvent.after_data.closingNotes && (
                  <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>ملاحظات تسوية الخزنة: </span>
                    <span style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>
                      "{selectedEvent.after_data.closingNotes}"
                    </span>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedEvent(null)}
                className="btn btn-secondary btn-sm"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
