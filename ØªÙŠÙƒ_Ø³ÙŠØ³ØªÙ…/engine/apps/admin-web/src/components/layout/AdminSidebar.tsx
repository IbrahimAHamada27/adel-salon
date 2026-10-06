'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavItem } from '@/types/navigation';

interface AdminSidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

const navItems: NavItem[] = [
  { title: 'الرئيسية', href: '/admin', iconName: '🏠', isImplemented: true },
  { title: 'إدارة الكتالوج', href: '/admin/catalog', iconName: '📦', isImplemented: true },
  { title: 'العروض والباقات', href: '/admin/promotions', iconName: '🎁', isImplemented: true },
  { title: 'الحجوزات', href: '/admin/bookings', iconName: '📅', isImplemented: true },
  { title: 'العملاء', href: '/admin/customers', iconName: '👥', isImplemented: true },
  { title: 'الموظفون والحلاقون', href: '/admin/staff', iconName: '✂️', isImplemented: true },
  { title: 'المبيعات', href: '/admin/sales', iconName: '🧾', isImplemented: true },
  { title: 'المصروفات', href: '/admin/expenses', iconName: '💸', isImplemented: true },
  { title: 'الورديات', href: '/admin/shifts', iconName: '⏱️', isImplemented: true },
  { title: 'التقارير', href: '/admin/reports', iconName: '📊', isImplemented: true },
  { title: 'سجل النشاط', href: '/admin/audit-log', iconName: '🛡️', isImplemented: true },
  { title: 'الإعدادات', href: '/admin/settings', iconName: '⚙️', isImplemented: true },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpenMobile,
  onCloseMobile,
}) => {
  const pathname = usePathname();

  const sidebarContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-subtle)',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: '1.2rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          T
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            tech
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            لوحة إدارة المحل
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav
        style={{
          flex: 1,
          padding: '16px 12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isActive ? 'var(--accent-primary-subtle)' : 'transparent',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.92rem',
                transition: 'all var(--transition-fast)',
                borderRight: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.1rem' }}>{item.iconName}</span>
                <span>{item.title}</span>
              </div>

              {item.badge && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent-primary)',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <a
          href="https://www.eng-ibrahim-a-hamada.website"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            padding: '8px 10px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-app)',
            border: '1px solid var(--border-subtle)',
            textDecoration: 'none',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
            e.currentTarget.style.backgroundColor = 'var(--accent-primary-subtle)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.backgroundColor = 'var(--bg-app)';
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
            تطوير : م. إبراهيم حمادة ↗
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', direction: 'ltr' }}>
            eng-ibrahim-a-hamada.website
          </span>
        </a>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          ADEL SALON Management Suite
        </span>
      </div>
    </div>
  );

  return (
    <>
      <aside
        style={{
          width: 'var(--sidebar-width)',
          height: '100vh',
          position: 'fixed',
          top: 0,
          right: 0,
          zIndex: 100,
          display: 'none',
        }}
        className="desktop-sidebar"
      >
        {sidebarContent}
      </aside>

      {isOpenMobile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 9999,
          }}
          onClick={onCloseMobile}
        >
          <div
            style={{
              width: '280px',
              height: '100%',
              position: 'absolute',
              right: 0,
              top: 0,
              backgroundColor: 'var(--bg-surface)',
              animation: 'slideInRtl var(--transition-fast) ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (min-width: 1024px) {
          .desktop-sidebar {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
};
