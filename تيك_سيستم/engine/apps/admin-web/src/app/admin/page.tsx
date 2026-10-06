'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { reportsApi, FinancialReport } from '@/services/reports.api';
import { settingsApi, SystemSettings } from '@/services/settings.api';
import { shiftsApi } from '@/services/shifts.api';

export default function AdminDashboardPage() {
  const { token, user } = useAuth();
  const [financial, setFinancial] = useState<FinancialReport | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [openShiftsCount, setOpenShiftsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    async function loadDashboardData() {
      try {
        const [finData, settsData, shiftsData] = await Promise.all([
          reportsApi.getFinancial(token!).catch(() => null),
          settingsApi.getSettings(token!).catch(() => null),
          shiftsApi.getShifts(token!, { status: 'OPEN' }).catch(() => null),
        ]);
        setFinancial(finData);
        setSettings(settsData);
        if (shiftsData?.summary) {
          setOpenShiftsCount(shiftsData.summary.openCount);
        }
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [token]);

  const quickLinks = [
    { title: 'إدارة الكتالوج', href: '/admin/catalog', icon: '📦', desc: 'الأقسام والمجموعات والخدمات' },
    { title: 'الموظفون والحلاقون', href: '/admin/staff', icon: '✂️', desc: 'سجلات العمل وحساب الكاشير' },
    { title: 'المبيعات والفواتير', href: '/admin/sales', icon: '🧾', desc: 'تتبع الفواتير والتحصيلات' },
    { title: 'الورديات والخزينة', href: '/admin/shifts', icon: '⏱️', desc: 'متابعة العهد وفروق الدرج' },
    { title: 'سجل المصروفات', href: '/admin/expenses', icon: '💸', desc: 'مصاريف التشغيل والسحب' },
    { title: 'العروض والباقات', href: '/admin/promotions', icon: '🎁', desc: 'حزم الخدمات والخصومات' },
    { title: 'إدارة الحجوزات', href: '/admin/bookings', icon: '📅', desc: 'المواعيد وجداول الحلاقين' },
    { title: 'التقارير المالية', href: '/admin/reports', icon: '📊', desc: 'الأرباح وتصدير البيانات' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(19, 28, 46, 0.95) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.75rem', fontWeight: 700, marginBottom: '10px' }}>
            <span>🟢</span> النظام متصل بالخادم المركزي
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            مرحباً بك، {user?.name || 'صاحب المحل'} 💈
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '560px' }}>
            لوحة الإدارة المركزية لمتابعة أداء الصالون، حركة المبيعات، عهد الكاشير، وتقارير الأرباح لحظة بلحظة.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/admin/sales" className="btn btn-primary">
            عرض المبيعات الحية
          </Link>
          <Link href="/admin/reports" className="btn btn-secondary">
            التقارير التحليلية
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {/* Revenue */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label" style={{ marginBottom: 0 }}>إجمالي الإيرادات</span>
            <span style={{ fontSize: '1.2rem' }}>💰</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--text-primary)' }}>
            {financial ? `${financial.revenue.toLocaleString()} ج.م` : loading ? '—' : '0 ج.م'}
          </div>
          <div className="stat-sub">
            صافي الأرباح: {financial ? `${financial.netIncome.toLocaleString()} ج.م` : '0 ج.م'}
          </div>
        </div>

        {/* Shifts */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label" style={{ marginBottom: 0 }}>الورديات المفتوحة</span>
            <span style={{ fontSize: '1.2rem' }}>⏱️</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
            {openShiftsCount > 0 ? `${openShiftsCount} وردية نشطة` : 'لا توجد ورديات مفتوحة'}
          </div>
          <div className="stat-sub">
            كاشير نقطة البيع في وضع الجاهزية
          </div>
        </div>

        {/* Invoices */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label" style={{ marginBottom: 0 }}>عدد الفواتير المنفذة</span>
            <span style={{ fontSize: '1.2rem' }}>🧾</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
            {financial?.invoicesCount || 0} فاتورة
          </div>
          <div className="stat-sub">
            المصروفات: {financial ? `${financial.expenses.toLocaleString()} ج.م` : '0 ج.م'}
          </div>
        </div>

        {/* Catalog Items */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label" style={{ marginBottom: 0 }}>الكتالوج والحلاقين</span>
            <span style={{ fontSize: '1.2rem' }}>✂️</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--text-primary)' }}>
            {(settings?.systemCounts?.services || 0) + (settings?.systemCounts?.products || 0)} عنصر
          </div>
          <div className="stat-sub">
            {settings?.systemCounts?.barbers || 0} حلاق وموظف مسجل
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🚀</span> الوصول السريع لأقسام الإدارة
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="stat-card"
              style={{
                textDecoration: 'none',
                cursor: 'pointer',
                display: 'block',
              }}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{item.icon}</div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* System Status Footnote */}
      <div style={{ padding: '14px 20px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🛡️</span>
          <span>محرك البيانات: SQLite المركزي مع تشفير ومعمارية Offline-First للكاشير</span>
        </div>
        <div style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>tech POS Engine • v1.0.0</div>
      </div>
    </div>
  );
}
