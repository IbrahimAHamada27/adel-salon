'use client';

import React, { useState, useEffect } from 'react';
import { Drawer } from '../ui/Drawer';
import { Input } from '../ui/Input';
import { PriceInput } from '../ui/PriceInput';
import { Button } from '../ui/Button';
import { Group, CatalogItem, CatalogStatus, CreateProductInput, UpdateCatalogItemInput } from '@/types/catalog';

interface ProductFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parentGroup: Group | null;
  productToEdit?: CatalogItem | null;
  onSubmit: (data: CreateProductInput | UpdateCatalogItemInput) => void;
  isLoading?: boolean;
}

export const ProductFormDrawer: React.FC<ProductFormDrawerProps> = ({
  isOpen,
  onClose,
  parentGroup,
  productToEdit,
  onSubmit,
  isLoading,
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [sku, setSku] = useState('');
  const [status, setStatus] = useState<CatalogStatus>('ACTIVE');
  const [internalNotes, setInternalNotes] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setPrice(productToEdit.price);
      setSku(productToEdit.sku || '');
      setStatus(productToEdit.status);
      setInternalNotes(productToEdit.internalNotes || '');
      setNameError('');
    } else {
      setName('');
      setPrice(0);
      setSku('');
      setStatus('ACTIVE');
      setInternalNotes('');
      setNameError('');
    }
  }, [productToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('اسم المنتج مطلوب ولا يمكن تركه فارغاً');
      return;
    }
    if (!parentGroup && !productToEdit) {
      setNameError('يجب اختيار مجموعة تابعة أولاً');
      return;
    }

    setNameError('');
    if (productToEdit) {
      onSubmit({
        name: name.trim(),
        price,
        sku: sku.trim() || undefined,
        status,
        internalNotes: internalNotes.trim() || undefined,
      } as UpdateCatalogItemInput);
    } else if (parentGroup) {
      onSubmit({
        groupId: parentGroup.id,
        name: name.trim(),
        price,
        sku: sku.trim() || undefined,
        status,
        internalNotes: internalNotes.trim() || undefined,
      } as CreateProductInput);
    }
  };

  const isEditing = !!productToEdit;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'تعديل المنتج' : 'إضافة منتج جديد'}
      subtitle={
        parentGroup
          ? `المنتج تابع للمجموعة: ${parentGroup.name}`
          : 'أضف منتجاً للبيع المباشر في الكاشير'
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {parentGroup && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '1rem' }}>🧴</span>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                المجموعة الحالية
              </span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--accent-product)' }}>
                {parentGroup.name}
              </strong>
            </div>
          </div>
        )}

        <Input
          label="اسم المنتج"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) setNameError('');
          }}
          placeholder="مثال: جل شعر، سيروم لحية، زيت طبيعي..."
          error={nameError}
          required
          autoFocus
        />

        <PriceInput
          label="سعر بيع المنتج"
          value={price}
          onChange={setPrice}
          required
          helperText="سعر البيع للزبون في الفاتورة"
        />

        <Input
          label="كود المنتج أو الباركود (SKU) - اختياري"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="مثال: PRD-9482"
          helperText="يستخدم للبحث السريع في الكاشير"
        />

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
            حالة المنتج
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="radio"
                name="product-status"
                value="ACTIVE"
                checked={status === 'ACTIVE'}
                onChange={() => setStatus('ACTIVE')}
              />
              <span>نشط</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="radio"
                name="product-status"
                value="HIDDEN"
                checked={status === 'HIDDEN'}
                onChange={() => setStatus('HIDDEN')}
              />
              <span>مخفي مؤقتاً</span>
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
            ملاحظات داخلية (اختياري)
          </label>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="ملاحظات تفصيلية للمنتج..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', gap: '12px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
          <Button variant="ghost" type="button" onClick={onClose} style={{ flex: 1 }}>
            إلغاء
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading} style={{ flex: 2 }}>
            {isEditing ? 'حفظ التعديلات' : 'إضافة المنتج'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
};
