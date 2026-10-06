'use client';

import React, { useState, useEffect } from 'react';
import { Drawer } from '../ui/Drawer';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Category, Group, CatalogStatus, CreateGroupInput, UpdateGroupInput } from '@/types/catalog';

interface GroupFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parentCategory: Category | null;
  groupToEdit?: Group | null;
  onSubmit: (data: CreateGroupInput | UpdateGroupInput) => void;
  isLoading?: boolean;
}

export const GroupFormDrawer: React.FC<GroupFormDrawerProps> = ({
  isOpen,
  onClose,
  parentCategory,
  groupToEdit,
  onSubmit,
  isLoading,
}) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<CatalogStatus>('ACTIVE');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (groupToEdit) {
      setName(groupToEdit.name);
      setStatus(groupToEdit.status);
      setNameError('');
    } else {
      setName('');
      setStatus('ACTIVE');
      setNameError('');
    }
  }, [groupToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('اسم المجموعة مطلوب ولا يمكن تركه فارغاً');
      return;
    }
    if (!parentCategory && !groupToEdit) {
      setNameError('يجب اختيار قسم رئيسي أولاً');
      return;
    }

    setNameError('');
    if (groupToEdit) {
      onSubmit({
        name: name.trim(),
        status,
      } as UpdateGroupInput);
    } else if (parentCategory) {
      onSubmit({
        categoryId: parentCategory.id,
        name: name.trim(),
        status,
      } as CreateGroupInput);
    }
  };

  const isEditing = !!groupToEdit;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'تعديل المجموعة' : 'إضافة مجموعة جديدة'}
      subtitle={
        parentCategory
          ? `المجموعة تابعة للقسم: ${parentCategory.name}`
          : 'أضف مجموعة داخل القسم لتصنيف الخدمات والمنتجات'
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {parentCategory && (
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
            <span style={{ fontSize: '1rem' }}>📁</span>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                القسم الرئيسي
              </span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--accent-primary)' }}>
                {parentCategory.name}
              </strong>
            </div>
          </div>
        )}

        <Input
          label="اسم المجموعة"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) setNameError('');
          }}
          placeholder="مثال: قص وتصفيف، صبغات، عناية بالوجه..."
          error={nameError}
          required
          autoFocus
        />

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
            حالة المجموعة
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="radio"
                name="group-status"
                value="ACTIVE"
                checked={status === 'ACTIVE'}
                onChange={() => setStatus('ACTIVE')}
              />
              <span>نشطة (تظهر في الكاشير)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="radio"
                name="group-status"
                value="HIDDEN"
                checked={status === 'HIDDEN'}
                onChange={() => setStatus('HIDDEN')}
              />
              <span>مخفية مؤقتاً</span>
            </label>
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', gap: '12px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
          <Button variant="ghost" type="button" onClick={onClose} style={{ flex: 1 }}>
            إلغاء
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading} style={{ flex: 2 }}>
            {isEditing ? 'حفظ التعديلات' : 'إضافة المجموعة'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
};
