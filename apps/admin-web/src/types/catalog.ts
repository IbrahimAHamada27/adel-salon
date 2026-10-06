export type CatalogItemType = 'SERVICE' | 'PRODUCT';
export type CatalogStatus = 'ACTIVE' | 'ARCHIVED' | 'HIDDEN';

export interface Category {
  id: string;
  name: string;
  colorCode?: string;
  icon?: string;
  sortOrder: number;
  status: CatalogStatus;
  groupCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  status: CatalogStatus;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  groupId: string;
  type: CatalogItemType;
  name: string;
  price: number;
  sku?: string;
  allowPriceOverride?: boolean;
  status: CatalogStatus;
  sortOrder: number;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  colorCode?: string;
  icon?: string;
  sortOrder?: number;
  status?: CatalogStatus;
}

export interface UpdateCategoryInput {
  name?: string;
  colorCode?: string;
  icon?: string;
  sortOrder?: number;
  status?: CatalogStatus;
}

export interface CreateGroupInput {
  categoryId: string;
  name: string;
  sortOrder?: number;
  status?: CatalogStatus;
}

export interface UpdateGroupInput {
  name?: string;
  sortOrder?: number;
  status?: CatalogStatus;
}

export interface CreateServiceInput {
  groupId: string;
  name: string;
  price: number;
  allowPriceOverride?: boolean;
  status?: CatalogStatus;
  sortOrder?: number;
  internalNotes?: string;
}

export interface CreateProductInput {
  groupId: string;
  name: string;
  price: number;
  sku?: string;
  status?: CatalogStatus;
  sortOrder?: number;
  internalNotes?: string;
}

export interface UpdateCatalogItemInput {
  name?: string;
  price?: number;
  sku?: string;
  allowPriceOverride?: boolean;
  status?: CatalogStatus;
  sortOrder?: number;
  internalNotes?: string;
}
