'use client';

import React from 'react';
import { Category } from '@/types/catalog';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';

interface CategoryColumnProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  onAddCategory: () => void;
  onEditCategory: (category: Category) => void;
  onArchiveCategory: (category: Category) => void;
  onRestoreCategory: (category: Category) => void;
  onReorderCategory: (category: Category, direction: 'UP' | 'DOWN') => void;
}

export const CategoryColumn: React.FC<CategoryColumnProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  onEditCategory,
  onArchiveCategory,
  onRestoreCategory,
  onReorderCategory,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      {/* Column Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface-elevated)',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            الأقسام الرئيسية
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            المستوى الأول في الكتالوج
          </span>
        </div>
        <Button variant="primary" size="sm" onClick={onAddCategory}>
          + إضافة قسم
        </Button>
      </div>

      {/* Column Body / List */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {categories.length === 0 ? (
          <EmptyState
            icon={<span>📁</span>}
            title="لم تُضف أي أقسام بعد"
            description="ابدأ بإضافة أول قسم لتنظيم خدمات ومنتجات المحل."
            actionLabel="+ إضافة أول قسم"
            onAction={onAddCategory}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categories.map((cat, index) => {
              const isSelected = selectedCategoryId === cat.id;
              const isFirst = index === 0;
              const isLast = index === categories.length - 1;
              const isArchived = cat.status === 'ARCHIVED';

              return (
                <div
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-app)',
                    border: isSelected
                      ? '2px solid var(--accent-primary)'
                      : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    opacity: isArchived ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: cat.colorCode || 'var(--accent-primary)',
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      <strong style={{ fontSize: '0.95rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                        {cat.name}
                      </strong>
                    </div>
                    <StatusBadge status={cat.status} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {cat.groupCount !== undefined ? `${cat.groupCount} مجموعات` : 'مجموعات القسم'}
                    </span>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        title="تحريك لأعلى"
                        disabled={isFirst}
                        onClick={() => onReorderCategory(cat, 'UP')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isFirst ? 'var(--text-muted)' : 'var(--text-secondary)',
                          cursor: isFirst ? 'not-allowed' : 'pointer',
                          padding: '3px 6px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem',
                        }}
                      >
                        ▲
                      </button>
                      <button
                        title="تحريك لأسفل"
                        disabled={isLast}
                        onClick={() => onReorderCategory(cat, 'DOWN')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isLast ? 'var(--text-muted)' : 'var(--text-secondary)',
                          cursor: isLast ? 'not-allowed' : 'pointer',
                          padding: '3px 6px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem',
                        }}
                      >
                        ▼
                      </button>

                      <button
                        title="تعديل القسم"
                        onClick={() => onEditCategory(cat)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '3px 6px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem',
                        }}
                      >
                        ✏️
                      </button>

                      {isArchived ? (
                        <button
                          title="استعادة القسم"
                          onClick={() => onRestoreCategory(cat)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--status-active)',
                            cursor: 'pointer',
                            padding: '3px 6px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.85rem',
                          }}
                        >
                          ♻️
                        </button>
                      ) : (
                        <button
                          title="أرشفة القسم"
                          onClick={() => onArchiveCategory(cat)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--status-danger)',
                            cursor: 'pointer',
                            padding: '3px 6px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.85rem',
                          }}
                        >
                          📦
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
