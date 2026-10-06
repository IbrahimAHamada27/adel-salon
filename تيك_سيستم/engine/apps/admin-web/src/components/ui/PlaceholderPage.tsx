import React from 'react';
import { EmptyState } from './EmptyState';

export interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description,
  icon = '⏳',
}) => {
  return (
    <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
          {title}
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>

      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-xl)',
          padding: '48px 24px',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <EmptyState
          icon={<span style={{ fontSize: '1.8rem' }}>{icon}</span>}
          title="سيتم تجهيز هذه الصفحة في مرحلة لاحقة"
          description="هذه الوظيفة مخصصة للمراحل التالية بعد اكتمال إعداد كتالوج المحل والربط مع الخادم السحابي."
        />
      </div>
    </div>
  );
};
