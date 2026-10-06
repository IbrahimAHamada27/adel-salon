'use client';

import React from 'react';
import { BreadcrumbItem } from '@/types/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AdminHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  onToggleMobileMenu?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  breadcrumbs,
  onToggleMobileMenu,
}) => {
  const { user, logout } = useAuth();

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}
    >
      {/* Right Side (Title & Breadcrumbs & Mobile Toggle) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={onToggleMobileMenu}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '1.4rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
          }}
          className="mobile-menu-toggle"
          aria-label="فتح القائمة"
        >
          ☰
        </button>

        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {title}
          </h1>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span>/</span>}
                  <span style={{ color: idx === breadcrumbs.length - 1 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    {crumb.label}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Left Side (Notifications & Real User Profile & Logout) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* User Account Display */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              color: '#fff',
              fontWeight: 800,
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {user?.name || 'صاحب المحل'}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {user?.username ? `@${user.username}` : 'مالك النظام'}
            </span>
          </div>
        </div>

        {/* Real Logout Button */}
        <button
          onClick={() => logout()}
          style={{
            background: 'var(--status-danger-subtle)',
            border: '1px solid var(--status-danger)',
            color: 'var(--status-danger)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          title="تسجيل الخروج من النظام"
        >
          تسجيل خروج
        </button>
      </div>

      <style jsx global>{`
        @media (min-width: 1024px) {
          .mobile-menu-toggle {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
