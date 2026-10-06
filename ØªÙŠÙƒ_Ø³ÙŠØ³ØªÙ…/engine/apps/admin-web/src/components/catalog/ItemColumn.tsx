'use client';

import React from 'react';
import { Group, CatalogItem } from '@/types/catalog';
import { Button } from '../ui/Button';
import { StatusBadge, TypeBadge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';

interface ItemColumnProps {
  selectedGroup: Group | null;
  items: CatalogItem[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onAddService: () => void;
  onAddProduct: () => void;
  onEditItem: (item: CatalogItem) => void;
  onArchiveItem: (item: CatalogItem) => void;
  onRestoreItem: (item: CatalogItem) => void;
  onReorderItem: (item: CatalogItem, direction: 'UP' | 'DOWN') => void;
}

export const ItemColumn: React.FC<ItemColumnProps> = ({
  selectedGroup,
  items,
  selectedItemId,
  onSelectItem,
  onAddService,
  onAddProduct,
  onEditItem,
  onArchiveItem,
  onRestoreItem,
  onReorderItem,
}) => {
  const isGroupSelected = !!selectedGroup;

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
            الخدمات والمنتجات
          </h2>
          <span style={{ fontSize: '0.75rem', color: isGroupSelected ? 'var(--accent-service)' : 'var(--text-muted)' }}>
            {selectedGroup ? `المجموعة: ${selectedGroup.name}` : 'المستوى الثالث في الكتالوج'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddProduct}
            disabled={!isGroupSelected}
            title={!isGroupSelected ? 'اختر مجموعة أولاً لإضافة منتج' : undefined}
          >
            + منتج
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onAddService}
            disabled={!isGroupSelected}
            title={!isGroupSelected ? 'اختر مجموعة أولاً لإضافة خدمة' : undefined}
          >
            + خدمة
          </Button>
        </div>
      </div>

      {/* Column Body / List */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {!isGroupSelected ? (
          <EmptyState
            icon={<span>👆</span>}
            title="اختر مجموعة أولاً"
            description="اختر مجموعة من القائمة لعرض خدماتها ومنتجاتها."
          />
        ) : items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <EmptyState
              icon={<span>✨</span>}
              title="لا توجد خدمات أو منتجات داخل هذه المجموعة"
              description="أضف أول خدمة أو منتج ليظهر لاحقاً في الكاشير."
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <Button variant="primary" size="sm" onClick={onAddService}>
                + إضافة أول خدمة
              </Button>
              <Button variant="outline" size="sm" onClick={onAddProduct}>
                + إضافة أول منتج
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map((item, index) => {
              const isSelected = selectedItemId === item.id;
              const isFirst = index === 0;
              const isLast = index === items.length - 1;
              const isArchived = item.status === 'ARCHIVED';

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item.id)}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TypeBadge type={item.type} />
                      <strong style={{ fontSize: '0.95rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                        {item.name}
                      </strong>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.price.toLocaleString('ar-EG')} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>ج.م</span>
                      </span>
                      {item.sku && (
                        <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-muted)' }}>
                          {item.sku}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        title="تحريك لأعلى"
                        disabled={isFirst}
                        onClick={() => onReorderItem(item, 'UP')}
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
                        onClick={() => onReorderItem(item, 'DOWN')}
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
                        title="تعديل"
                        onClick={() => onEditItem(item)}
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
                          title="استعادة"
                          onClick={() => onRestoreItem(item)}
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
                          title="أرشفة"
                          onClick={() => onArchiveItem(item)}
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
