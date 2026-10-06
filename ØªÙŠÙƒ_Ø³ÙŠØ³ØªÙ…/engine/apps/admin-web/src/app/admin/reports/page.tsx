'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  reportsApi,
  FinancialReport,
  BarberReportItem,
  TopServiceItem,
  PromotionReportItem,
  BookingsReport,
} from '@/services/reports.api';

type ReportTab = 'financial' | 'barbers' | 'services' | 'promotions' | 'bookings';

export default function ReportsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>('financial');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data States
  const [financial, setFinancial] = useState<FinancialReport | null>(null);
  const [barbers, setBarbers] = useState<BarberReportItem[]>([]);
  const [topServices, setTopServices] = useState<TopServiceItem[]>([]);
  const [promotions, setPromotions] = useState<PromotionReportItem[]>([]);
  const [bookings, setBookings] = useState<BookingsReport | null>(null);

  const loadReportData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      if (activeTab === 'financial') {
        const data = await reportsApi.getFinancial(token, params);
        setFinancial(data);
      } else if (activeTab === 'barbers') {
        const data = await reportsApi.getBarbers(token, params);
        setBarbers(data);
      } else if (activeTab === 'services') {
        const data = await reportsApi.getTopServices(token, params);
        setTopServices(data);
      } else if (activeTab === 'promotions') {
        const data = await reportsApi.getPromotions(token, params);
        setPromotions(data);
      } else if (activeTab === 'bookings') {
        const data = await reportsApi.getBookings(token, params);
        setBookings(data);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل التقرير');
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, startDate, endDate]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const handleExportExcel = async (type: 'sales' | 'expenses' | 'shifts') => {
    if (!token) return;
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/admin/reports/export/excel?type=${type}${
        startDate ? `&startDate=${startDate}` : ''
      }${endDate ? `&endDate=${endDate}` : ''}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('فشل تصدير ملف الإكسل');
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const typeNames: Record<string, string> = { sales: 'مبيعات', expenses: 'مصروفات', shifts: 'ورديات' };
      a.download = `تقرير_${typeNames[type] || type}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(err.message || 'فشل تحميل الملف');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📊</span> التقارير المالية والتشغيلية
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            تحليل دقيق للأرباح، الإيرادات، أداء الحلاقين، وأكثر الخدمات طلباً مع إمكانية التصدير بصيغة Excel.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="filter-group">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>تصدير إكسل Excel:</span>
          <button
            onClick={() => handleExportExcel('sales')}
            className="btn btn-secondary btn-sm"
          >
            <span>🧾</span> المبيعات (.xlsx)
          </button>
          <button
            onClick={() => handleExportExcel('expenses')}
            className="btn btn-secondary btn-sm"
          >
            <span>💸</span> المصروفات (.xlsx)
          </button>
          <button
            onClick={() => handleExportExcel('shifts')}
            className="btn btn-secondary btn-sm"
          >
            <span>⏱️</span> الورديات (.xlsx)
          </button>
        </div>
      </div>

      {/* Date Filters & Tabs */}
      <div className="filter-bar">
        {/* Tabs */}
        <div style={{ display: 'inline-flex', backgroundColor: '#070d18', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '2px' }}>
          {[
            { id: 'financial', label: 'التقرير المالي', icon: '💰' },
            { id: 'barbers', label: 'أداء الحلاقين', icon: '✂️' },
            { id: 'services', label: 'الخدمات والمنتجات', icon: '🔥' },
            { id: 'promotions', label: 'العروض والباقات', icon: '🎁' },
            { id: 'bookings', label: 'الحجوزات', icon: '📅' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none' }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
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
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
            >
              مسح
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

      {/* Content Area */}
      {loading ? (
        <div style={{ padding: '50px', textAlign: 'center', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
          جاري استخراج وتحليل بيانات التقرير...
        </div>
      ) : (
        <>
          {/* 1. FINANCIAL REPORT TAB */}
          {activeTab === 'financial' && financial && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Top Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">إجمالي المبيعات (Gross)</div>
                  <div className="stat-value">{financial.revenue.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>ج.م</span></div>
                  <div className="stat-sub">من {financial.invoicesCount} فاتورة مدفوعة</div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">إجمالي المصروفات</div>
                  <div className="stat-value" style={{ color: 'var(--accent-rose)' }}>{financial.expenses.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>ج.م</span></div>
                  <div className="stat-sub">من {financial.expensesCount} سند صرف</div>
                </div>

                <div className="stat-card" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', backgroundColor: '#0d221c' }}>
                  <div className="stat-label" style={{ color: '#6ee7b7', fontWeight: 700 }}>صافي الدخل والأرباح</div>
                  <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{financial.netIncome.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>ج.م</span></div>
                  <div className="stat-sub" style={{ color: '#a7f3d0' }}>(الإيرادات - المصروفات)</div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">إجمالي الخصومات الممنوحة</div>
                  <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>{financial.discounts.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>ج.م</span></div>
                  <div className="stat-sub">المجموع قبل الخصم: {financial.subtotal.toLocaleString()} ج.م</div>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💳</span> تفصيل وسائل الدفع
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div style={{ backgroundColor: '#070d18', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>💵 الدفع النقدي (كاش)</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.82rem' }}>
                        {financial.revenue > 0 ? `${Math.round((financial.cashRevenue / financial.revenue) * 100)}%` : '0%'}
                      </span>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {financial.cashRevenue.toLocaleString()} ج.م
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#070d18', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>💳 الدفع الإلكتروني (فيزا / شبكة)</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.82rem' }}>
                        {financial.revenue > 0 ? `${Math.round((financial.cardRevenue / financial.revenue) * 100)}%` : '0%'}
                      </span>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {financial.cardRevenue.toLocaleString()} ج.م
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. BARBERS REPORT TAB */}
          {activeTab === 'barbers' && (
            <div className="table-container">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>إحصائيات إنتاجية ودخل الحلاقين</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>العدد: {barbers.length}</span>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>اسم الحلاق / الموظف</th>
                      <th>المسمى الوظيفي</th>
                      <th>الحالة</th>
                      <th style={{ textAlign: 'center' }}>الخدمات المنفذة</th>
                      <th style={{ textAlign: 'left' }}>إجمالي دخل الخدمات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barbers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          لا توجد بيانات خدمات منفذة خلال الفترة المحددة.
                        </td>
                      </tr>
                    ) : (
                      barbers.map((b) => (
                        <tr key={b.barber_id}>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.barber_name}</td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{b.role_title || 'حلاق'}</td>
                          <td>
                            <span className={`badge ${b.employee_status === 'ACTIVE' ? 'badge-emerald' : 'badge-slate'}`}>
                              {b.employee_status === 'ACTIVE' ? 'نشط' : 'مؤرشف'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                            {b.services_performed}
                          </td>
                          <td style={{ textAlign: 'left', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-primary)' }}>
                            {b.total_service_revenue.toLocaleString()} ج.م
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. TOP SERVICES TAB */}
          {activeTab === 'services' && (
            <div className="table-container">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>أكثر الخدمات والمنتجات مبيعاً وطلباً</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>العدد: {topServices.length}</span>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>العنصر</th>
                      <th>النوع</th>
                      <th style={{ textAlign: 'center' }}>مرات البيع</th>
                      <th style={{ textAlign: 'center' }}>الكمية الإجمالية</th>
                      <th style={{ textAlign: 'left' }}>إجمالي الإيرادات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topServices.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          لا توجد مبيعات مسجلة في الفترة المحددة.
                        </td>
                      </tr>
                    ) : (
                      topServices.map((s, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.item_name}</td>
                          <td>
                            <span className={`badge ${s.item_type === 'SERVICE' ? 'badge-indigo' : 'badge-emerald'}`}>
                              {s.item_type === 'SERVICE' ? 'خدمة' : 'منتج'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{s.times_sold}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {s.total_quantity}
                          </td>
                          <td style={{ textAlign: 'left', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-primary)' }}>
                            {s.total_revenue.toLocaleString()} ج.م
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. PROMOTIONS TAB */}
          {activeTab === 'promotions' && (
            <div className="table-container">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>تقرير مبيعات العروض والباقات</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>العدد: {promotions.length}</span>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>اسم العرض / الباقة</th>
                      <th>السعر الثابت</th>
                      <th style={{ textAlign: 'center' }}>مرات البيع</th>
                      <th style={{ textAlign: 'left' }}>إجمالي الإيرادات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotions.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          لا توجد بيانات مبيعات للعروض في هذه الفترة.
                        </td>
                      </tr>
                    ) : (
                      promotions.map((p) => (
                        <tr key={p.promotion_id}>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.promotion_name}</td>
                          <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{p.fixed_price.toLocaleString()} ج.م</td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-cyan)' }}>{p.sales_count}</td>
                          <td style={{ textAlign: 'left', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-primary)' }}>
                            {p.total_revenue.toLocaleString()} ج.م
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. BOOKINGS TAB */}
          {activeTab === 'bookings' && bookings && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">إجمالي الحجوزات</div>
                  <div className="stat-value">{bookings.summary.total_bookings}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">مؤكدة</div>
                  <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{bookings.summary.confirmed_count}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">حضر (Arrived)</div>
                  <div className="stat-value" style={{ color: 'var(--accent-indigo)' }}>{bookings.summary.arrived_count}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">تحولت لفاتورة</div>
                  <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{bookings.summary.converted_count}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">لم يحضر (No Show)</div>
                  <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>{bookings.summary.no_show_count}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">ملغاة</div>
                  <div className="stat-value" style={{ color: 'var(--accent-rose)' }}>{bookings.summary.cancelled_count}</div>
                </div>
              </div>

              {/* By Barber */}
              <div className="table-container">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>توزيع الحجوزات حسب الحلاق</h3>
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>اسم الحلاق</th>
                        <th style={{ textAlign: 'center' }}>عدد الحجوزات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.byBarber.length === 0 ? (
                        <tr>
                          <td colSpan={2} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            لا توجد حجوزات مسجلة للحلاقين في هذه الفترة.
                          </td>
                        </tr>
                      ) : (
                        bookings.byBarber.map((b) => (
                          <tr key={b.barber_id}>
                            <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.barber_name}</td>
                            <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                              {b.bookings_count}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
