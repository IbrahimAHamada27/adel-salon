'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { customersApi, Customer, CustomerHistory } from '@/services/customers.api';

export default function CustomersPage() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historyData, setHistoryData] = useState<CustomerHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await customersApi.getCustomers(token, {
        search: search || undefined,
        limit: 100,
      });
      setCustomers(data.customers || []);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل سجل العملاء');
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFullName('');
    setPhoneNumber('');
    setBirthDate('');
    setInternalNote('');
    setFormError(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFullName(c.full_name);
    setPhoneNumber(c.phone_number || '');
    setBirthDate(c.birth_date || '');
    setInternalNote(c.internal_note || '');
    setFormError(null);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!fullName.trim()) {
      setFormError('يرجى إدخال اسم العميل');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      if (editingCustomer) {
        await customersApi.updateCustomer(token, editingCustomer.id, {
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
          birthDate: birthDate.trim() || undefined,
          internalNote: internalNote.trim() || undefined,
        });
      } else {
        await customersApi.createCustomer(token, {
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
          birthDate: birthDate.trim() || undefined,
          internalNote: internalNote.trim() || undefined,
        });
      }
      setShowAddModal(false);
      loadCustomers();
    } catch (err: any) {
      setFormError(err.message || 'فشل حفظ بيانات العميل');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleViewHistory = async (c: Customer) => {
    if (!token) return;
    setHistoryCustomer(c);
    setHistoryLoading(true);
    try {
      const hist = await customersApi.getCustomerHistory(token, c.id);
      setHistoryData(hist);
    } catch (err: any) {
      alert(err.message || 'فشل جلب سجل زيارات العميل');
    } finally {
      setHistoryLoading(false);
    }
  };

  const totalSpentAll = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👥</span> سجل ودليل العملاء
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            إدارة بيانات العملاء، تتبع سجل الزيارات والمشتريات، وتفضيلات المواعيد.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadCustomers}
            disabled={loading}
            className="btn btn-secondary btn-sm"
          >
            <span>🔄</span> تحديث
          </button>
          <button
            onClick={handleOpenAdd}
            className="btn btn-primary"
          >
            <span>➕</span> إضافة عميل جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">إجمالي العملاء المسجلين</div>
          <div className="stat-value">{customers.length}</div>
          <div className="stat-sub">دليل عملاء المحل</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">إجمالي إنفاق العملاء</div>
          <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
            {totalSpentAll.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>ج.م</span>
          </div>
          <div className="stat-sub">مشتريات مسجلة في الفواتير</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">متوسط الصرف لكل عميل</div>
          <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
            {customers.length > 0 ? Math.round(totalSpentAll / customers.length).toLocaleString() : 0} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>ج.م</span>
          </div>
          <div className="stat-sub">معدل قيمة العميل</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="filter-bar">
        <div style={{ position: 'relative', width: '320px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الهاتف..."
            className="form-input"
            style={{ paddingRight: '32px' }}
          />
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>🔍</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Customers Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>اسم العميل</th>
                <th>رقم الهاتف</th>
                <th>تاريخ الميلاد</th>
                <th style={{ textAlign: 'center' }}>عدد الزيارات</th>
                <th style={{ textAlign: 'center' }}>إجمالي الإنفاق</th>
                <th>آخر زيارة</th>
                <th style={{ textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    جاري تحميل سجل العملاء...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    لا يوجد عملاء مسجلين حالياً.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.full_name}</div>
                      {c.internal_note && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.internal_note}</div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-secondary)' }} dir="ltr">
                      {c.phone_number || '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {c.birth_date || '—'}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {c.invoices_count || 0}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-primary)' }}>
                      {(c.total_spent || 0).toLocaleString()} ج.م
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {c.last_visit_at ? new Date(c.last_visit_at).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleViewHistory(c)}
                          className="btn btn-secondary btn-sm"
                          title="عرض سجل الزيارات"
                        >
                          📜 السجل
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="btn btn-secondary btn-sm"
                          title="تعديل البيانات"
                        >
                          ✏️ تعديل
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{editingCustomer ? '✏️' : '➕'}</span>
                <span>{editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>
                ✕
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '0.8rem', marginBottom: '14px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>اسم العميل *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: أحمد عبد الله"
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>رقم الهاتف</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="مثال: 01012345678"
                  dir="ltr"
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>تاريخ الميلاد</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>ملاحظات داخلية</label>
                <textarea
                  rows={2}
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="تفضيلات الحلاقة، طلبات خاصة، إلخ..."
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn btn-primary btn-sm"
                >
                  {formSubmitting ? 'جاري الحفظ...' : editingCustomer ? 'حفظ التعديلات' : 'إضافة العميل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer History Modal */}
      {historyCustomer && (
        <div className="modal-overlay" onClick={() => setHistoryCustomer(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📜</span> سجل زيارات ومشتريات: {historyCustomer.full_name}
              </h3>
              <button onClick={() => setHistoryCustomer(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>
                ✕
              </button>
            </div>

            {historyLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>جاري تحميل سجل العميل...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Past Invoices */}
                <div>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>الفواتير والزيارات السابقة</h4>
                  {historyData?.invoices && historyData.invoices.length > 0 ? (
                    <div className="table-container">
                      <table className="data-table" style={{ fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th>رقم الفاتورة</th>
                            <th>التاريخ</th>
                            <th>المبلغ</th>
                            <th>طريقة الدفع</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData.invoices.map((inv) => (
                            <tr key={inv.id}>
                              <td style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{inv.invoice_number}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{new Date(inv.created_at).toLocaleDateString('ar-EG')}</td>
                              <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>{(inv.total || 0).toLocaleString()} ج.م</td>
                              <td>{inv.payment_method === 'CASH' ? 'كاش' : 'فيزا'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '16px', backgroundColor: '#070d18', borderRadius: 'var(--radius-md)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      لا توجد فواتير سابقة مسجلة لهذا العميل.
                    </div>
                  )}
                </div>

                {/* Past Bookings */}
                <div>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>سجل الحجوزات والمواعيد</h4>
                  {historyData?.bookings && historyData.bookings.length > 0 ? (
                    <div className="table-container">
                      <table className="data-table" style={{ fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th>التاريخ والوقت</th>
                            <th>الحلاق</th>
                            <th>الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData.bookings.map((b) => (
                            <tr key={b.id}>
                              <td style={{ color: 'var(--text-secondary)' }}>{b.booking_date} {b.start_time}</td>
                              <td>{b.barber_name || '—'}</td>
                              <td>
                                <span className="badge badge-slate">{b.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '16px', backgroundColor: '#070d18', borderRadius: 'var(--radius-md)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      لا توجد مواعيد سابقة مسجلة.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '14px' }}>
              <button
                onClick={() => setHistoryCustomer(null)}
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
