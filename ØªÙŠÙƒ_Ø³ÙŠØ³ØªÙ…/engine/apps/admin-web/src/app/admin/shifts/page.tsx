'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { shiftsApi, Shift } from '@/services/shifts.api';

export default function ShiftsPage() {
  const { token } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Summary counts
  const [summary, setSummary] = useState({ totalCount: 0, openCount: 0, closedCount: 0 });

  // Selected Shift Modal
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const loadShifts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await shiftsApi.getShifts(token, {
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setShifts(data.shifts || []);
      setSummary(data.summary || { totalCount: 0, openCount: 0, closedCount: 0 });
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل الورديات');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, startDate, endDate]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⏱️</span> الورديات وحركة الخزينة
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            متابعة دقيقة لورديات الكاشير، عهدة البداية، مبيعات النقد والشبكة، والمصروفات، وفروقات الجرد الفعلي.
          </p>
        </div>
        <button
          onClick={loadShifts}
          disabled={loading}
          className="btn btn-secondary btn-sm"
        >
          <span>🔄</span> {loading ? 'جاري التحديث...' : 'تحديث البيانات'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">إجمالي الورديات المسجلة</div>
          <div className="stat-value">{summary.totalCount}</div>
          <div className="stat-sub">سجلات الورديات في النظام</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
          <div className="stat-label">الورديات المفتوحة حالياً</div>
          <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{summary.openCount}</div>
          <div className="stat-sub">قيد الاستخدام من الكاشير</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">الورديات المقفلة والمرحلة</div>
          <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>{summary.closedCount}</div>
          <div className="stat-sub">تمت مراجعتها وجردها</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <div style={{ display: 'inline-flex', backgroundColor: '#070d18', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            {(['ALL', 'OPEN', 'CLOSED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
                style={{ border: 'none' }}
              >
                {s === 'ALL' ? 'جميع الحالات' : s === 'OPEN' ? 'مفتوحة الآن' : 'مقفلة'}
              </button>
            ))}
          </div>
        </div>

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
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
            >
              مسح التاريخ
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

      {/* Shifts Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>كود الوردية</th>
                <th>الحالة</th>
                <th>الكاشير</th>
                <th>وقت الفتح</th>
                <th>وقت الإغلاق</th>
                <th>عهدة البداية</th>
                <th>النقد المتوقع</th>
                <th>الجرد الفعلي</th>
                <th>فارق الخزينة</th>
                <th style={{ textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    جاري تحميل سجلات الورديات...
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    لا توجد ورديات مسجلة تطابق خيارات البحث الحالية.
                  </td>
                </tr>
              ) : (
                shifts.map((s) => {
                  const diff = s.cash_difference || 0;
                  return (
                    <tr key={s.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {s.id.slice(0, 8)}...
                      </td>
                      <td>
                        <span className={`badge ${s.status === 'OPEN' ? 'badge-emerald' : 'badge-slate'}`}>
                          {s.status === 'OPEN' ? '🟢 مفتوحة' : '🔒 مقفلة'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {s.cashier_name || s.cashier_id || 'كاشير المحل'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(s.opened_at).toLocaleString('ar-EG')}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {s.closed_at ? new Date(s.closed_at).toLocaleString('ar-EG') : '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                        {(s.opening_balance || 0).toLocaleString()} ج.م
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {(s.expected_cash || 0).toLocaleString()} ج.م
                      </td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                        {s.actual_cash !== null ? `${(s.actual_cash || 0).toLocaleString()} ج.م` : '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {s.status === 'OPEN' ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>قيد التشغيل</span>
                        ) : diff === 0 ? (
                          <span style={{ color: 'var(--accent-primary)', fontSize: '0.8rem' }}>متطابق (0)</span>
                        ) : diff > 0 ? (
                          <span style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>+{diff.toLocaleString()} (فائض)</span>
                        ) : (
                          <span style={{ color: 'var(--accent-rose)', fontSize: '0.8rem' }}>{diff.toLocaleString()} (عجز)</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedShift(s)}
                          className="btn btn-secondary btn-sm"
                        >
                          عرض التفاصيل
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

      {/* Shift Details Modal */}
      {selectedShift && (
        <div className="modal-overlay" onClick={() => setSelectedShift(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⏱️</span> تفاصيل الوردية ({selectedShift.id.slice(0, 8)})
              </h3>
              <button onClick={() => setSelectedShift(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#070d18', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>الحالة:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedShift.status === 'OPEN' ? '🟢 مفتوحة حالياً' : '🔒 مقفلة ومراجعة'}
                </span>
              </div>
              <div style={{ backgroundColor: '#070d18', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>الكاشير:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedShift.cashier_name || selectedShift.cashier_id || 'كاشير المحل'}
                </span>
              </div>
              <div style={{ backgroundColor: '#070d18', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>وقت الفتح:</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {new Date(selectedShift.opened_at).toLocaleString('ar-EG')}
                </span>
              </div>
              <div style={{ backgroundColor: '#070d18', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>وقت الإغلاق:</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {selectedShift.closed_at ? new Date(selectedShift.closed_at).toLocaleString('ar-EG') : '—'}
                </span>
              </div>
            </div>

            {/* Financial Totals */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>ملخص الخزينة والمبيعات:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '0.82rem' }}>
                <div style={{ backgroundColor: '#070d18', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '2px' }}>عهدة البداية</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {(selectedShift.opening_balance || 0).toLocaleString()} ج.م
                  </div>
                </div>
                <div style={{ backgroundColor: '#070d18', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '2px' }}>مبيعات كاش</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    {(selectedShift.cash_sales || 0).toLocaleString()} ج.م
                  </div>
                </div>
                <div style={{ backgroundColor: '#070d18', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '2px' }}>مبيعات شبكة</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {(selectedShift.card_sales || 0).toLocaleString()} ج.م
                  </div>
                </div>
                <div style={{ backgroundColor: '#070d18', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '2px' }}>المصروفات</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-rose)' }}>
                    {(selectedShift.total_expenses || 0).toLocaleString()} ج.م
                  </div>
                </div>
                <div style={{ backgroundColor: '#070d18', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '2px' }}>النقد المتوقع في الدرج</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-amber)' }}>
                    {(selectedShift.expected_cash || 0).toLocaleString()} ج.م
                  </div>
                </div>
                <div style={{ backgroundColor: '#070d18', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '2px' }}>الجرد الفعلي المسجل</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#c084fc' }}>
                    {selectedShift.actual_cash !== null ? `${(selectedShift.actual_cash || 0).toLocaleString()} ج.م` : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Difference Banner */}
            {selectedShift.status === 'CLOSED' && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontWeight: 600,
                  marginBottom: '14px',
                  backgroundColor:
                    selectedShift.cash_difference === 0
                      ? 'rgba(16, 185, 129, 0.15)'
                      : selectedShift.cash_difference > 0
                      ? 'rgba(6, 182, 212, 0.15)'
                      : 'rgba(244, 63, 94, 0.15)',
                  border: `1px solid ${
                    selectedShift.cash_difference === 0
                      ? 'var(--accent-primary)'
                      : selectedShift.cash_difference > 0
                      ? 'var(--accent-cyan)'
                      : 'var(--accent-rose)'
                  }`,
                  color:
                    selectedShift.cash_difference === 0
                      ? '#6ee7b7'
                      : selectedShift.cash_difference > 0
                      ? '#67e8f9'
                      : '#fca5a5',
                }}
              >
                <span>نتيجة الجرد الفعلي:</span>
                <span style={{ fontWeight: 800 }}>
                  {selectedShift.cash_difference === 0
                    ? 'خزينة متطابقة تماماً بدون فروق (0)'
                    : selectedShift.cash_difference > 0
                    ? `فائض في الخزينة بقيمة +${selectedShift.cash_difference.toLocaleString()} ج.م`
                    : `عجز في الخزينة بقيمة ${selectedShift.cash_difference.toLocaleString()} ج.م`}
                </span>
              </div>
            )}

            {selectedShift.notes && (
              <div style={{ backgroundColor: '#070d18', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', marginBottom: '14px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>ملاحظات الكاشير عند الإغلاق:</span>
                <p style={{ color: 'var(--text-primary)' }}>{selectedShift.notes}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
              <button
                onClick={() => setSelectedShift(null)}
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
