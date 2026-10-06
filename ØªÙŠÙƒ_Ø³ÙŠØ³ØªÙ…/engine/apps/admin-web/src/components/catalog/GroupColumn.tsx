'use client';

import React from 'react';
import { Category, Group } from '@/types/catalog';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';

interface GroupColumnProps {
  selectedCategory: Category | null;
  groups: Group[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onAddGroup: () => void;
  onEditGroup: (group: Group) => void;
  onArchiveGroup: (group: Group) => void;
  onRestoreGroup: (group: Group) => void;
  onReorderGroup: (group: Group, direction: 'UP' | 'DOWN') => void;
}

export const GroupColumn: React.FC<GroupColumnProps> = ({
  selectedCategory,
  groups,
  selectedGroupId,
  onSelectGroup,
  onAddGroup,
  onEditGroup,
  onArchiveGroup,
  onRestoreGroup,
  onReorderGroup,
}) => {
  const isCategorySelected = !!selectedCategory;

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
            المجموعات
          </h2>
          <span style={{ fontSize: '0.75rem', color: isCategorySelected ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
            {selectedCategory ? `القسم: ${selectedCategory.name}` : 'المستوى الثاني في الكتالوج'}
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={onAddGroup}
          disabled={!isCategorySelected}
          title={!isCategorySelected ? 'اختر قسماً أولاً لإضافة مجموعة' : undefined}
        >
          + إضافة مجموعة
        </Button>
      </div>

      {/* Column Body / List */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {!isCategorySelected ? (
          <EmptyState
            icon={<span>👆</span>}
            title="اختر قسماً أولاً"
            description="اختر قسماً من القائمة لعرض مجموعاته وإدارة محتواها."
          />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<span>📂</span>}
            title="لا توجد مجموعات داخل هذا القسم"
            description="أضف مجموعة ثم أضف الخدمات أو المنتجات داخلها."
            actionLabel="+ إضافة أول مجموعة"
            onAction={onAddGroup}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {groups.map((grp, index) => {
              const isSelected = selectedGroupId === grp.id;
              const isFirst = index === 0;
              const isLast = index === groups.length - 1;
              const isArchived = grp.status === 'ARCHIVED';

              return (
                <div
                  key={grp.id}
                  onClick={() => onSelectGroup(grp.id)}
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
                      <span style={{ fontSize: '0.9rem' }}>📂</span>
                      <strong style={{ fontSize: '0.95rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                        {grp.name}
                      </strong>
                    </div>
                    <StatusBadge status={grp.status} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {grp.itemCount !== undefined ? `${grp.itemCount} عناصر` : 'عناصر المجموعة'}
                    </span>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        title="تحريك لأعلى"
                        disabled={isFirst}
                        onClick={() => onReorderGroup(grp, 'UP')}
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
                        onClick={() => onReorderGroup(grp, 'DOWN')}
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
                        title="تعديل المجموعة"
                        onClick={() => onEditGroup(grp)}
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
                          title="استعادة المجموعة"
                          onClick={() => onRestoreGroup(grp)}
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
                          title="أرشفة المجموعة"
                          onClick={() => onArchiveGroup(grp)}
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
