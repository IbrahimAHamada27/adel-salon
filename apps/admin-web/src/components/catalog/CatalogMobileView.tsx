'use client';

import React, { useState } from 'react';
import { Category, Group, CatalogItem } from '@/types/catalog';
import { CategoryColumn } from './CategoryColumn';
import { GroupColumn } from './GroupColumn';
import { ItemColumn } from './ItemColumn';

interface CatalogMobileViewProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string) => void;
  onAddCategory: () => void;
  onEditCategory: (cat: Category) => void;
  onArchiveCategory: (cat: Category) => void;
  onRestoreCategory: (cat: Category) => void;
  onReorderCategory: (cat: Category, dir: 'UP' | 'DOWN') => void;

  selectedCategory: Category | null;
  groups: Group[];
  selectedGroupId: string | null;
  onSelectGroup: (id: string) => void;
  onAddGroup: () => void;
  onEditGroup: (grp: Group) => void;
  onArchiveGroup: (grp: Group) => void;
  onRestoreGroup: (grp: Group) => void;
  onReorderGroup: (grp: Group, dir: 'UP' | 'DOWN') => void;

  selectedGroup: Group | null;
  items: CatalogItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  onAddService: () => void;
  onAddProduct: () => void;
  onEditItem: (item: CatalogItem) => void;
  onArchiveItem: (item: CatalogItem) => void;
  onRestoreItem: (item: CatalogItem) => void;
  onReorderItem: (item: CatalogItem, dir: 'UP' | 'DOWN') => void;
}

export const CatalogMobileView: React.FC<CatalogMobileViewProps> = (props) => {
  const [mobileLevel, setMobileLevel] = useState<number>(0);

  const handleCategorySelect = (id: string) => {
    props.onSelectCategory(id);
    setMobileLevel(1);
  };

  const handleGroupSelect = (id: string) => {
    props.onSelectGroup(id);
    setMobileLevel(2);
  };

  return (
    <div className="catalog-mobile-container" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: 'var(--bg-surface-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setMobileLevel(0)}
            style={{
              background: 'transparent',
              border: 'none',
              color: mobileLevel === 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: mobileLevel === 0 ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            الأقسام
          </button>

          {props.selectedCategory && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>←</span>
              <button
                onClick={() => setMobileLevel(1)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: mobileLevel === 1 ? 'var(--accent-primary)' : 'var(--text-muted)',
                  fontWeight: mobileLevel === 1 ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {props.selectedCategory.name}
              </button>
            </>
          )}

          {props.selectedGroup && mobileLevel === 2 && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>←</span>
              <span style={{ color: 'var(--accent-service)', fontWeight: 700 }}>
                {props.selectedGroup.name}
              </span>
            </>
          )}
        </div>

        {mobileLevel > 0 && (
          <button
            onClick={() => setMobileLevel(mobileLevel - 1)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-secondary)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            رجوع
          </button>
        )}
      </div>

      <div style={{ minHeight: '480px' }}>
        {mobileLevel === 0 && (
          <CategoryColumn
            categories={props.categories}
            selectedCategoryId={props.selectedCategoryId}
            onSelectCategory={handleCategorySelect}
            onAddCategory={props.onAddCategory}
            onEditCategory={props.onEditCategory}
            onArchiveCategory={props.onArchiveCategory}
            onRestoreCategory={props.onRestoreCategory}
            onReorderCategory={props.onReorderCategory}
          />
        )}

        {mobileLevel === 1 && (
          <GroupColumn
            selectedCategory={props.selectedCategory}
            groups={props.groups}
            selectedGroupId={props.selectedGroupId}
            onSelectGroup={handleGroupSelect}
            onAddGroup={props.onAddGroup}
            onEditGroup={props.onEditGroup}
            onArchiveGroup={props.onArchiveGroup}
            onRestoreGroup={props.onRestoreGroup}
            onReorderGroup={props.onReorderGroup}
          />
        )}

        {mobileLevel === 2 && (
          <ItemColumn
            selectedGroup={props.selectedGroup}
            items={props.items}
            selectedItemId={props.selectedItemId}
            onSelectItem={props.onSelectItem}
            onAddService={props.onAddService}
            onAddProduct={props.onAddProduct}
            onEditItem={props.onEditItem}
            onArchiveItem={props.onArchiveItem}
            onRestoreItem={props.onRestoreItem}
            onReorderItem={props.onReorderItem}
          />
        )}
      </div>

      <style jsx global>{`
        @media (min-width: 1024px) {
          .catalog-mobile-container {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
