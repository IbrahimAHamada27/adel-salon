'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { salesApi, Invoice, SalesResponse } from '@/services/sales.api';

export default function SalesPage() {
  const { token } = useAuth();
  const [data, setData] = useState<SalesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK'>('TODAY');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Invoice Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const loadInvoices = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setError(null);

      let startDate: string | undefined;
      let endDate: string | undefined;

      const now = new Date();
      if (dateFilter === 'TODAY') {
        startDate = now.toISOString().split('T')[0];
        endDate = startDate;
      } else if (dateFilter === 'WEEK') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
      }

      const res = await salesApi.getInvoices(token, {
        startDate,
        endDate,
        paymentMethod: paymentFilter,
        status: statusFilter,
        search: searchTerm,
        limit: 100,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'فشل جلب سجل المبيعات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [token, dateFilter, paymentFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInvoices();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧾</span> المبيعات والفواتير
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            سجل الفواتير الصادرة من الكاشير، طرق السداد، وتفاصيل الخدمات والمنتجات المباعة.
          </p>
        </div>
        <button onClick={loadInvoices} disabled={isLoading} className="btn btn-secondary btn-sm">
          <span>🔄</span> {isLoading ? 'جاري التحديث...' : 'تحديث'}
        </button>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">إجمالي المبيعات</div>
            <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
              {data.summary.totalSales.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>ج.م</span>
            </div>
            <div className="stat-sub">الفترة الحالية المحددة</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">عدد الفواتير المنفذة</div>
            <div className="stat-value">
              {data.summary.totalCount} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>فاتورة</span>
            </div>
            <div className="stat-sub">فواتير مرحلة من الكاشير</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">إجمالي الخصومات والتسويات</div>
            <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>
              {data.summary.totalDiscount.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>ج.م</span>
            </div>
            <div className="stat-sub">خصومات مباشرة على الفواتير</div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          {/* Quick Date Toggle */}
          <div style={{ display: 'inline-flex', backgroundColor: '#070d18', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setDateFilter('TODAY')}
              className={`btn btn-sm ${dateFilter === 'TODAY' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none' }}
            >
              اليوم
            </button>
            <button
              onClick={() => setDateFilter('WEEK')}
              className={`btn btn-sm ${dateFilter === 'WEEK' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none' }}
            >
              آخر 7 أيام
            </button>
            <button
              onClick={() => setDateFilter('ALL')}
              className={`btn btn-sm ${dateFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none' }}
            >
              الكل
            </button>
          </div>

          {/* Payment Method */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="form-select"
            style={{ width: '160px' }}
          >
            <option value="ALL">جميع طرق الدفع</option>
            <option value="CASH">نقدي (Cash)</option>
            <option value="CARD">شبكة / بطاقة (Card)</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
            style={{ width: '150px' }}
          >
            <option value="ALL">جميع الحالات</option>
            <option value="PAID">مدفوعة (PAID)</option>
            <option value="CANCELLED">ملغاة (CANCELLED)</option>
          </select>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="filter-group">
          <div style={{ position: 'relative', width: '220px' }}>
            <input
              type="text"
              placeholder="بحث برقم الفاتورة أو العميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingRight: '32px' }}
            />
            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>🔍</span>
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">
            بحث
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Invoices Table */}
      <div className="table-container">
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>جاري تحميل سجل الفواتير...</div>
        ) : !data || data.invoices.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🧾</div>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>لا توجد فواتير مطابقة للفلاتر الحالية</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>تظهر الفواتير هنا تلقائياً عند قيام الكاشير بعمليات البيع والمزامنة.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>التاريخ والوقت</th>
                  <th>العميل</th>
                  <th>طريقة الدفع</th>
                  <th>المبلغ الإجمالي</th>
                  <th>الحالة</th>
                  <th style={{ textAlign: 'center' }}>التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {inv.invoice_number || inv.id.substring(0, 8)}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(inv.created_at).toLocaleString('ar-EG')}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                      {inv.customer_name || 'عميل نقدي (ضيف)'}
                    </td>
                    <td>
                      {inv.payment_method === 'CASH' ? (
                        <span className="badge badge-emerald">💵 نقدي</span>
                      ) : (
                        <span className="badge badge-indigo">💳 شبكة / بطاقة</span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {inv.total_amount.toLocaleString()} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ج.م</span>
                    </td>
                    <td>
                      {inv.status === 'PAID' ? (
                        <span className="badge badge-emerald">مدفوعة</span>
                      ) : (
                        <span className="badge badge-rose">ملغاة</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="btn btn-secondary btn-sm"
                      >
                        عرض الفاتورة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>فاتورة رقم: {selectedInvoice.invoice_number}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  التاريخ: {new Date(selectedInvoice.created_at).toLocaleString('ar-EG')} • الكاشير: {selectedInvoice.cashier_name || 'الكاشير'}
                </p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ backgroundColor: '#070d18', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>العميل:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedInvoice.customer_name || 'عميل نقدي (ضيف)'}</span>
                </div>
                {selectedInvoice.customer_phone && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>الهاتف:</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }} dir="ltr">{selectedInvoice.customer_phone}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>طريقة الدفع:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedInvoice.payment_method === 'CASH' ? 'نقدي (كاش)' : 'بطاقة / شبكة'}</span>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>عناصر وبنود الفاتورة:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {selectedInvoice.lines && selectedInvoice.lines.map((line) => (
                    <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#070d18', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{line.item_name_snapshot}</div>
                        {line.barber_name && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', marginTop: '2px' }}>الحلاق: {line.barber_name}</div>
                        )}
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>{line.total_price.toLocaleString()} ج.م</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{line.quantity} × {line.unit_price} ج.م</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>المجموع الفرعي:</span>
                  <span style={{ fontFamily: 'monospace' }}>{selectedInvoice.subtotal.toLocaleString()} ج.م</span>
                </div>
                {selectedInvoice.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-amber)' }}>
                    <span>الخصم:</span>
                    <span style={{ fontFamily: 'monospace' }}>-{selectedInvoice.discount_amount.toLocaleString()} ج.م</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-primary)', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span>الإجمالي النهائي:</span>
                  <span style={{ fontFamily: 'monospace' }}>{selectedInvoice.total_amount.toLocaleString()} ج.م</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="btn btn-secondary btn-sm"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
