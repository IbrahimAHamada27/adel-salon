import React from 'react';
import { CatalogItemType, CatalogStatus } from '@/types/catalog';

interface StatusBadgeProps {
  status: CatalogStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'ACTIVE':
        return { label: 'نشط', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
      case 'ARCHIVED':
        return { label: 'مؤرشف', bg: 'rgba(100, 116, 139, 0.18)', color: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)' };
      case 'HIDDEN':
        return { label: 'مخفي', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
      default:
        return { label: status, bg: 'transparent', color: 'var(--text-muted)', border: 'var(--border-subtle)' };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        lineHeight: 1.2,
      }}
    >
      {config.label}
    </span>
  );
};

interface TypeBadgeProps {
  type: CatalogItemType;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  const isService = type === 'SERVICE';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.75rem',
        fontWeight: 700,
        backgroundColor: isService ? 'var(--accent-service-subtle)' : 'var(--accent-product-subtle)',
        color: isService ? 'var(--accent-service)' : 'var(--accent-product)',
        border: `1px solid ${isService ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
        lineHeight: 1.2,
      }}
    >
      {isService ? 'خدمة' : 'منتج'}
    </span>
  );
};
