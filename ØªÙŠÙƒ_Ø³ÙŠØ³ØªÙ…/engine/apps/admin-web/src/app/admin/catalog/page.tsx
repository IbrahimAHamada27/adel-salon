'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Category,
  Group,
  CatalogItem,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateGroupInput,
  UpdateGroupInput,
  CreateServiceInput,
  CreateProductInput,
  UpdateCatalogItemInput,
} from '@/types/catalog';
import { catalogApi } from '@/services/catalog.api';
import { CatalogThreeColumnView } from '@/components/catalog/CatalogThreeColumnView';
import { CatalogMobileView } from '@/components/catalog/CatalogMobileView';
import { CategoryFormDrawer } from '@/components/catalog/CategoryFormDrawer';
import { GroupFormDrawer } from '@/components/catalog/GroupFormDrawer';
import { ServiceFormDrawer } from '@/components/catalog/ServiceFormDrawer';
import { ProductFormDrawer } from '@/components/catalog/ProductFormDrawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ToastContainer, ToastMessage } from '@/components/ui/Toast';

export default function CatalogPage() {
  // --- Real Data States (Initialized empty from server) ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);

  // --- Loading States ---
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Selection State ---
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // --- Drawer Open States ---
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  const [isGroupDrawerOpen, setIsGroupDrawerOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);

  const [isServiceDrawerOpen, setIsServiceDrawerOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<CatalogItem | null>(null);

  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<CatalogItem | null>(null);

  // --- Confirm Dialog State ---
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // --- Toasts ---
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- API Fetching: Categories ---
  const fetchCategories = useCallback(async () => {
    try {
      setIsLoadingCategories(true);
      const data = await catalogApi.getCategories();
      setCategories(data);
    } catch (err: any) {
      addToast(err.message || 'فشل جلب الأقسام من السيرفر', 'error');
    } finally {
      setIsLoadingCategories(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // --- API Fetching: Groups of Selected Category ---
  const fetchGroups = useCallback(async (categoryId: string) => {
    try {
      setIsLoadingGroups(true);
      const data = await catalogApi.getGroupsByCategory(categoryId);
      setGroups(data);
    } catch (err: any) {
      addToast(err.message || 'فشل جلب المجموعات من السيرفر', 'error');
    } finally {
      setIsLoadingGroups(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchGroups(selectedCategoryId);
    } else {
      setGroups([]);
    }
  }, [selectedCategoryId, fetchGroups]);

  // --- API Fetching: Items of Selected Group ---
  const fetchItems = useCallback(async (groupId: string) => {
    try {
      setIsLoadingItems(true);
      const data = await catalogApi.getItemsByGroup(groupId);
      setItems(data);
    } catch (err: any) {
      addToast(err.message || 'فشل جلب الخدمات والمنتجات من السيرفر', 'error');
    } finally {
      setIsLoadingItems(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchItems(selectedGroupId);
    } else {
      setItems([]);
    }
  }, [selectedGroupId, fetchItems]);

  // --- Active Selected Objects ---
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || null;
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null;

  // ==========================================
  // Category Handlers (Real API)
  // ==========================================
  const handleCreateCategory = async (data: CreateCategoryInput | UpdateCategoryInput) => {
    try {
      setIsSubmitting(true);
      if (categoryToEdit) {
        const updated = await catalogApi.updateCategory(categoryToEdit.id, data);
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        addToast(`تم تحديث القسم "${updated.name}" بنجاح`);
      } else {
        const created = await catalogApi.createCategory(data as CreateCategoryInput);
        setCategories((prev) => [...prev, created]);
        setSelectedCategoryId(created.id);
        addToast(`تم إنشاء القسم "${created.name}" بنجاح`);
      }
      setIsCategoryDrawerOpen(false);
      setCategoryToEdit(null);
    } catch (err: any) {
      addToast(err.message || 'فشلت عملية حفظ القسم', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveCategory = (category: Category) => {
    setConfirmState({
      isOpen: true,
      title: 'أرشفة القسم',
      message: `هل أنت متأكد من أرشفة القسم "${category.name}"؟ سيتم إخفاؤه من الكاشير مع حفظ جميع بياناته في النظام.`,
      onConfirm: async () => {
        try {
          const archived = await catalogApi.archiveCategory(category.id);
          setCategories((prev) => prev.map((c) => (c.id === archived.id ? archived : c)));
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          addToast(`تمت أرشفة القسم "${category.name}" بنجاح`);
        } catch (err: any) {
          addToast(err.message || 'فشلت أرشفة القسم', 'error');
        }
      },
    });
  };

  const handleRestoreCategory = async (category: Category) => {
    try {
      const restored = await catalogApi.restoreCategory(category.id);
      setCategories((prev) => prev.map((c) => (c.id === restored.id ? restored : c)));
      addToast(`تمت استعادة القسم "${category.name}" بنجاح`);
    } catch (err: any) {
      addToast(err.message || 'فشلت استعادة القسم', 'error');
    }
  };

  const handleReorderCategory = async (category: Category, direction: 'UP' | 'DOWN') => {
    try {
      const reordered = await catalogApi.reorderCategory(category.id, direction);
      setCategories(reordered);
      addToast('تم تحديث ترتيب الأقسام');
    } catch (err: any) {
      addToast(err.message || 'فشل تغيير ترتيب الأقسام', 'error');
    }
  };

  // ==========================================
  // Group Handlers (Real API)
  // ==========================================
  const handleCreateGroup = async (data: CreateGroupInput | UpdateGroupInput) => {
    try {
      setIsSubmitting(true);
      if (groupToEdit) {
        const updated = await catalogApi.updateGroup(groupToEdit.id, data);
        setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        addToast(`تم تحديث المجموعة "${updated.name}" بنجاح`);
      } else {
        const created = await catalogApi.createGroup(data as CreateGroupInput);
        setGroups((prev) => [...prev, created]);
        setSelectedGroupId(created.id);
        // Refresh category group count
        fetchCategories();
        addToast(`تم إنشاء المجموعة "${created.name}" بنجاح`);
      }
      setIsGroupDrawerOpen(false);
      setGroupToEdit(null);
    } catch (err: any) {
      addToast(err.message || 'فشلت عملية حفظ المجموعة', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveGroup = (group: Group) => {
    setConfirmState({
      isOpen: true,
      title: 'أرشفة المجموعة',
      message: `هل أنت متأكد من أرشفة المجموعة "${group.name}"؟ ستختفي خدماتها ومنتجاتها من الكاشير.`,
      onConfirm: async () => {
        try {
          const archived = await catalogApi.archiveGroup(group.id);
          setGroups((prev) => prev.map((g) => (g.id === archived.id ? archived : g)));
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          addToast(`تمت أرشفة المجموعة "${group.name}" بنجاح`);
        } catch (err: any) {
          addToast(err.message || 'فشلت أرشفة المجموعة', 'error');
        }
      },
    });
  };

  const handleRestoreGroup = async (group: Group) => {
    try {
      const restored = await catalogApi.restoreGroup(group.id);
      setGroups((prev) => prev.map((g) => (g.id === restored.id ? restored : g)));
      addToast(`تمت استعادة المجموعة "${group.name}" بنجاح`);
    } catch (err: any) {
      addToast(err.message || 'فشلت استعادة المجموعة', 'error');
    }
  };

  const handleReorderGroup = async (group: Group, direction: 'UP' | 'DOWN') => {
    try {
      const reordered = await catalogApi.reorderGroup(group.id, direction);
      setGroups(reordered);
      addToast('تم تحديث ترتيب المجموعات');
    } catch (err: any) {
      addToast(err.message || 'فشل تغيير ترتيب المجموعات', 'error');
    }
  };

  // ==========================================
  // Item (Service / Product) Handlers (Real API)
  // ==========================================
  const handleCreateService = async (data: CreateServiceInput | UpdateCatalogItemInput) => {
    try {
      setIsSubmitting(true);
      if (serviceToEdit) {
        const updated = await catalogApi.updateItem(serviceToEdit.id, data);
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        addToast(`تم تحديث الخدمة "${updated.name}" بنجاح`);
      } else {
        const created = await catalogApi.createService(data as CreateServiceInput);
        setItems((prev) => [...prev, created]);
        setSelectedItemId(created.id);
        if (selectedCategoryId) fetchGroups(selectedCategoryId);
        addToast(`تمت إضافة الخدمة "${created.name}" بنجاح`);
      }
      setIsServiceDrawerOpen(false);
      setServiceToEdit(null);
    } catch (err: any) {
      addToast(err.message || 'فشلت إضافة الخدمة', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProduct = async (data: CreateProductInput | UpdateCatalogItemInput) => {
    try {
      setIsSubmitting(true);
      if (productToEdit) {
        const updated = await catalogApi.updateItem(productToEdit.id, data);
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        addToast(`تم تحديث المنتج "${updated.name}" بنجاح`);
      } else {
        const created = await catalogApi.createProduct(data as CreateProductInput);
        setItems((prev) => [...prev, created]);
        setSelectedItemId(created.id);
        if (selectedCategoryId) fetchGroups(selectedCategoryId);
        addToast(`تمت إضافة المنتج "${created.name}" بنجاح`);
      }
      setIsProductDrawerOpen(false);
      setProductToEdit(null);
    } catch (err: any) {
      addToast(err.message || 'فشلت إضافة المنتج', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveItem = (item: CatalogItem) => {
    const isService = item.type === 'SERVICE';
    setConfirmState({
      isOpen: true,
      title: isService ? 'أرشفة الخدمة' : 'أرشفة المنتج',
      message: `هل أنت متأكد من أرشفة ${isService ? 'الخدمة' : 'المنتج'} "${item.name}"؟`,
      onConfirm: async () => {
        try {
          const archived = await catalogApi.archiveItem(item.id);
          setItems((prev) => prev.map((i) => (i.id === archived.id ? archived : i)));
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          addToast(`تمت أرشفة "${item.name}" بنجاح`);
        } catch (err: any) {
          addToast(err.message || 'فشلت أرشفة العنصر', 'error');
        }
      },
    });
  };

  const handleRestoreItem = async (item: CatalogItem) => {
    try {
      const restored = await catalogApi.restoreItem(item.id);
      setItems((prev) => prev.map((i) => (i.id === restored.id ? restored : i)));
      addToast(`تمت استعادة "${item.name}" بنجاح`);
    } catch (err: any) {
      addToast(err.message || 'فشلت استعادة العنصر', 'error');
    }
  };

  const handleReorderItem = async (item: CatalogItem, direction: 'UP' | 'DOWN') => {
    try {
      const reordered = await catalogApi.reorderItem(item.id, direction);
      setItems(reordered);
      addToast('تم تحديث ترتيب العناصر');
    } catch (err: any) {
      addToast(err.message || 'فشل تغيير ترتيب العناصر', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            إدارة الكتالوج والخدمات
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            أنشئ الأقسام والمجموعات والخدمات والمنتجات التي ستظهر لاحقاً في الكاشير وتُحفظ مباشرة في قاعدة بيانات السيرفر.
          </p>
        </div>

        {/* Hierarchy Helper Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            backgroundColor: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <span>التسلسل:</span>
          <strong style={{ color: 'var(--accent-primary)' }}>قسم</strong>
          <span>←</span>
          <strong style={{ color: 'var(--accent-primary)' }}>مجموعة</strong>
          <span>←</span>
          <strong style={{ color: 'var(--accent-service)' }}>خدمة</strong>
          <span>أو</span>
          <strong style={{ color: 'var(--accent-product)' }}>منتج</strong>
        </div>
      </div>

      {/* Desktop 3-Column View */}
      <CatalogThreeColumnView
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={(id) => {
          setSelectedCategoryId(id);
          setSelectedGroupId(null);
          setSelectedItemId(null);
        }}
        onAddCategory={() => {
          setCategoryToEdit(null);
          setIsCategoryDrawerOpen(true);
        }}
        onEditCategory={(cat) => {
          setCategoryToEdit(cat);
          setIsCategoryDrawerOpen(true);
        }}
        onArchiveCategory={handleArchiveCategory}
        onRestoreCategory={handleRestoreCategory}
        onReorderCategory={handleReorderCategory}

        selectedCategory={selectedCategory}
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={(id) => {
          setSelectedGroupId(id);
          setSelectedItemId(null);
        }}
        onAddGroup={() => {
          setGroupToEdit(null);
          setIsGroupDrawerOpen(true);
        }}
        onEditGroup={(grp) => {
          setGroupToEdit(grp);
          setIsGroupDrawerOpen(true);
        }}
        onArchiveGroup={handleArchiveGroup}
        onRestoreGroup={handleRestoreGroup}
        onReorderGroup={handleReorderGroup}

        selectedGroup={selectedGroup}
        items={items}
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId}
        onAddService={() => {
          setServiceToEdit(null);
          setIsServiceDrawerOpen(true);
        }}
        onAddProduct={() => {
          setProductToEdit(null);
          setIsProductDrawerOpen(true);
        }}
        onEditItem={(item) => {
          if (item.type === 'SERVICE') {
            setServiceToEdit(item);
            setIsServiceDrawerOpen(true);
          } else {
            setProductToEdit(item);
            setIsProductDrawerOpen(true);
          }
        }}
        onArchiveItem={handleArchiveItem}
        onRestoreItem={handleRestoreItem}
        onReorderItem={handleReorderItem}
      />

      {/* Mobile Drill-Down View */}
      <CatalogMobileView
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={(id) => {
          setSelectedCategoryId(id);
          setSelectedGroupId(null);
          setSelectedItemId(null);
        }}
        onAddCategory={() => {
          setCategoryToEdit(null);
          setIsCategoryDrawerOpen(true);
        }}
        onEditCategory={(cat) => {
          setCategoryToEdit(cat);
          setIsCategoryDrawerOpen(true);
        }}
        onArchiveCategory={handleArchiveCategory}
        onRestoreCategory={handleRestoreCategory}
        onReorderCategory={handleReorderCategory}

        selectedCategory={selectedCategory}
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={(id) => {
          setSelectedGroupId(id);
          setSelectedItemId(null);
        }}
        onAddGroup={() => {
          setGroupToEdit(null);
          setIsGroupDrawerOpen(true);
        }}
        onEditGroup={(grp) => {
          setGroupToEdit(grp);
          setIsGroupDrawerOpen(true);
        }}
        onArchiveGroup={handleArchiveGroup}
        onRestoreGroup={handleRestoreGroup}
        onReorderGroup={handleReorderGroup}

        selectedGroup={selectedGroup}
        items={items}
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId}
        onAddService={() => {
          setServiceToEdit(null);
          setIsServiceDrawerOpen(true);
        }}
        onAddProduct={() => {
          setProductToEdit(null);
          setIsProductDrawerOpen(true);
        }}
        onEditItem={(item) => {
          if (item.type === 'SERVICE') {
            setServiceToEdit(item);
            setIsServiceDrawerOpen(true);
          } else {
            setProductToEdit(item);
            setIsProductDrawerOpen(true);
          }
        }}
        onArchiveItem={handleArchiveItem}
        onRestoreItem={handleRestoreItem}
        onReorderItem={handleReorderItem}
      />

      {/* Form Drawers */}
      <CategoryFormDrawer
        isOpen={isCategoryDrawerOpen}
        onClose={() => {
          setIsCategoryDrawerOpen(false);
          setCategoryToEdit(null);
        }}
        categoryToEdit={categoryToEdit}
        onSubmit={handleCreateCategory}
        isLoading={isSubmitting}
      />

      <GroupFormDrawer
        isOpen={isGroupDrawerOpen}
        onClose={() => {
          setIsGroupDrawerOpen(false);
          setGroupToEdit(null);
        }}
        parentCategory={selectedCategory}
        groupToEdit={groupToEdit}
        onSubmit={handleCreateGroup}
        isLoading={isSubmitting}
      />

      <ServiceFormDrawer
        isOpen={isServiceDrawerOpen}
        onClose={() => {
          setIsServiceDrawerOpen(false);
          setServiceToEdit(null);
        }}
        parentGroup={selectedGroup}
        serviceToEdit={serviceToEdit}
        onSubmit={handleCreateService}
        isLoading={isSubmitting}
      />

      <ProductFormDrawer
        isOpen={isProductDrawerOpen}
        onClose={() => {
          setIsProductDrawerOpen(false);
          setProductToEdit(null);
        }}
        parentGroup={selectedGroup}
        productToEdit={productToEdit}
        onSubmit={handleCreateProduct}
        isLoading={isSubmitting}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        isDanger={true}
        confirmLabel="أرشفة"
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
