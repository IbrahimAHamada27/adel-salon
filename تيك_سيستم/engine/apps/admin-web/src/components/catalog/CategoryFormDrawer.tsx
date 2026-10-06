'use client';

import React, { useState, useEffect } from 'react';
import { Drawer } from '../ui/Drawer';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Category, CatalogStatus, CreateCategoryInput, UpdateCategoryInput } from '@/types/catalog';

interface CategoryFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: Category | null;
  onSubmit: (data: CreateCategoryInput | UpdateCategoryInput) => void;
  isLoading?: boolean;
}

export const CategoryFormDrawer: React.FC<CategoryFormDrawerProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  onSubmit,
  isLoading,
}) => {
  const [name, setName] = useState('');
  const [colorCode, setColorCode] = useState('#059669');
  const [icon, setIcon] = useState('');
  const [status, setStatus] = useState<CatalogStatus>('ACTIVE');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setColorCode(categoryToEdit.colorCode || '#059669');
      setIcon(categoryToEdit.icon || '');
      setStatus(categoryToEdit.status);
      setNameError('');
    } else {
      setName('');
      setColorCode('#059669');
      setIcon('');
      setStatus('ACTIVE');
      setNameError('');
    }
  }, [categoryToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('اسم القسم مطلوب ولا يمكن تركه فارغاً');
      return;
    }

    setNameError('');
    onSubmit({
      name: name.trim(),
      colorCode,
      icon: icon.trim() || undefined,
      status,
    });
  };

  const isEditing = !!categoryToEdit;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'تعديل القسم' : 'إضافة قسم جديد'}
      subtitle={isEditing ? 'تعديل بيانات القسم وتأثيره في الكاشير' : 'أضف قسماً رئيسياً لتنظيم المجموعات والخدمات'}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Input
          label="اسم القسم"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) setNameError('');
          }}
          placeholder="مثال: خدمات الشعر، العناية بالبشرة..."
          error={nameError}
          required
          autoFocus
        />

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
            لون تمييز القسم في الكاشير (اختياري)
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {['#059669', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#64748b'].map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setColorCode(color)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: colorCode === color ? '3px solid #fff' : '2px solid transparent',
                  cursor: 'pointer',
                  boxShadow: colorCode === color ? '0 0 0 2px var(--accent-primary)' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
            حالة القسم
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="radio"
                name="category-status"
                value="ACTIVE"
                checked={status === 'ACTIVE'}
                onChange={() => setStatus('ACTIVE')}
              />
              <span>نشط (يظهر في الكاشير)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="radio"
                name="category-status"
                value="HIDDEN"
                checked={status === 'HIDDEN'}
                onChange={() => setStatus('HIDDEN')}
              />
              <span>مخفي مؤقتاً</span>
            </label>
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', gap: '12px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
          <Button variant="ghost" type="button" onClick={onClose} style={{ flex: 1 }}>
            إلغاء
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading} style={{ flex: 2 }}>
            {isEditing ? 'حفظ التعديلات' : 'إضافة القسم'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
};
