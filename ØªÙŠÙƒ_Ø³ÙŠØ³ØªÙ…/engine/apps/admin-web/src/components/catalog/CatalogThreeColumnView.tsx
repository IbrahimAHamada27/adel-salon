'use client';

import React from 'react';
import { Category, Group, CatalogItem } from '@/types/catalog';
import { CategoryColumn } from './CategoryColumn';
import { GroupColumn } from './GroupColumn';
import { ItemColumn } from './ItemColumn';

interface CatalogThreeColumnViewProps {
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

export const CatalogThreeColumnView: React.FC<CatalogThreeColumnViewProps> = (props) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        height: 'calc(100vh - var(--header-height) - 130px)',
        minHeight: '520px',
      }}
      className="catalog-desktop-grid"
    >
      <CategoryColumn
        categories={props.categories}
        selectedCategoryId={props.selectedCategoryId}
        onSelectCategory={props.onSelectCategory}
        onAddCategory={props.onAddCategory}
        onEditCategory={props.onEditCategory}
        onArchiveCategory={props.onArchiveCategory}
        onRestoreCategory={props.onRestoreCategory}
        onReorderCategory={props.onReorderCategory}
      />

      <GroupColumn
        selectedCategory={props.selectedCategory}
        groups={props.groups}
        selectedGroupId={props.selectedGroupId}
        onSelectGroup={props.onSelectGroup}
        onAddGroup={props.onAddGroup}
        onEditGroup={props.onEditGroup}
        onArchiveGroup={props.onArchiveGroup}
        onRestoreGroup={props.onRestoreGroup}
        onReorderGroup={props.onReorderGroup}
      />

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

      <style jsx global>{`
        @media (max-width: 1023px) {
          .catalog-desktop-grid {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
