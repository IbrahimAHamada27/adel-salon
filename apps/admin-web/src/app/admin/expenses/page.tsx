'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { expensesApi, Expense, ExpensesResponse } from '@/services/expenses.api';

export default function ExpensesPage() {
  const { token } = useAuth();
  const [data, setData] = useState<ExpensesResponse | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ category: '', amount: '', description: '' });

  const loadExpenses = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setError(null);
      const [res, cats] = await Promise.all([
        expensesApi.getExpenses(token, {
          category: selectedCategory,
          search: searchTerm,
          limit: 100,
        }),
        expensesApi.getCategories(token),
      ]);
      setData(res);
      setCategories(cats);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل سجل المصروفات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [token, selectedCategory]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !form.category.trim() || !form.amount) return;

    try {
      await expensesApi.createExpense(token, {
        category: form.category.trim(),
        amount: parseFloat(form.amount),
        description: form.description.trim() || undefined,
      });
      setSuccessMsg('تم تسجيل المصروف بنجاح');
      setIsModalOpen(false);
      setForm({ category: '', amount: '', description: '' });
      loadExpenses();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ المصروف');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💸</span> المصروفات النقدية
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            تسجيل ومراجعة مصروفات الورديات والتشغيل، تصنيفاتها، وتأثيرها على صافي دخل المحل.
          </p>
        </div>
        <button
          onClick={() => {
            setForm({ category: categories[0] || 'مستلزمات صالون', amount: '', description: '' });
            setIsModalOpen(true);
          }}
          className="btn btn-danger"
        >
          <span>➕</span> تسجيل مصروف جديد
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-md)', color: '#6ee7b7', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Summary Cards */}
      {data && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">إجمالي المصروفات</div>
            <div className="stat-value" style={{ color: 'var(--accent-rose)' }}>
              {data.summary.totalSpent.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>ج.م</span>
            </div>
            <div className="stat-sub">إجمالي سندات الصرف</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">عدد المصروفات</div>
            <div className="stat-value">
              {data.summary.totalCount} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>سجل</span>
            </div>
            <div className="stat-sub">سندات صرف مسجلة</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">التصنيفات المستخدمة</div>
            <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
              {data.summary.categoriesCount} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>تصنيف</span>
            </div>
            <div className="stat-sub">تشغيل، صيانة، سحب نقدي</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>التصنيف:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="form-select"
            style={{ width: '180px' }}
          >
            <option value="ALL">جميع التصنيفات</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadExpenses();
          }}
          className="filter-group"
        >
          <div style={{ position: 'relative', width: '220px' }}>
            <input
              type="text"
              placeholder="بحث في الوصف أو التصنيف..."
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

      {/* Expenses Table */}
      <div className="table-container">
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>جاري تحميل سجل المصروفات...</div>
        ) : !data || data.expenses.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>💸</div>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>لا توجد مصروفات مسجلة بعد</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>تظهر هنا كافة المصروفات التي تسجلها الإدارة أو كاشير الوردية.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>التاريخ والوقت</th>
                  <th>التصنيف</th>
                  <th>المبلغ</th>
                  <th>البيان / الوصف</th>
                  <th>المسجل</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(exp.created_at).toLocaleString('ar-EG')}
                    </td>
                    <td>
                      <span className="badge badge-slate">
                        {exp.category}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-rose)' }}>
                      {exp.amount.toLocaleString()} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ج.م</span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {exp.description || '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {exp.cashier_name || 'المالك'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>تسجيل مصروف جديد</h3>
            <form onSubmit={handleCreateExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>التصنيف *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="form-select"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="CUSTOM">+ تصنيف مخصص آخر...</option>
                  </select>
                  {form.category === 'CUSTOM' && (
                    <input
                      type="text"
                      placeholder="اكتب اسم التصنيف الجديد..."
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="form-input"
                    />
                  )}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>المبلغ (ج.م) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>البيان / تفاصيل المصروف</label>
                <textarea
                  rows={3}
                  placeholder="ملاحظات أو تفاصيل الفاتورة أو سبب الصرف..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="form-textarea"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-danger btn-sm"
                >
                  حفظ المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
