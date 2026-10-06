'use client';

import React, { useState, useEffect } from 'react';
import { Drawer } from '../ui/Drawer';
import { Input } from '../ui/Input';
import { PriceInput } from '../ui/PriceInput';
import { Button } from '../ui/Button';
import { Group, CatalogItem, CatalogStatus, CreateServiceInput, UpdateCatalogItemInput } from '@/types/catalog';

interface ServiceFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parentGroup: Group | null;
  serviceToEdit?: CatalogItem | null;
  onSubmit: (data: CreateServiceInput | UpdateCatalogItemInput) => void;
  isLoading?: boolean;
}

export const ServiceFormDrawer: React.FC<ServiceFormDrawerProps> = ({
  isOpen,
  onClose,
  parentGroup,
  serviceToEdit,
  onSubmit,
  isLoading,
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [allowPriceOverride, setAllowPriceOverride] = useState(false);
  const [status, setStatus] = useState<CatalogStatus>('ACTIVE');
  const [internalNotes, setInternalNotes] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (serviceToEdit) {
      setName(serviceToEdit.name);
      setPrice(serviceToEdit.price);
      setAllowPriceOverride(serviceToEdit.allowPriceOverride || false);
      setStatus(serviceToEdit.status);
      setInternalNotes(serviceToEdit.internalNotes || '');
      setNameError('');
    } else {
      setName('');
      setPrice(0);
      setAllowPriceOverride(false);
      setStatus('ACTIVE');
      setInternalNotes('');
      setNameError('');
    }
  }, [serviceToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('اسم الخدمة مطلوب ولا يمكن تركه فارغاً');
      return;
    }
    if (!parentGroup && !serviceToEdit) {
      setNameError('يجب اختيار مجموعة تابعة أولاً');
      return;
    }

    setNameError('');
    if (serviceToEdit) {
      onSubmit({
        name: name.trim(),
        price,
        allowPriceOverride,
        status,
        internalNotes: internalNotes.trim() || undefined,
      } as UpdateCatalogItemInput);
    } else if (parentGroup) {
      onSubmit({
        groupId: parentGroup.id,
        name: name.trim(),
        price,
        allowPriceOverride,
        status,
        internalNotes: internalNotes.trim() || undefined,
      } as CreateServiceInput);
    }
  };

  const isEditing = !!serviceToEdit;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}
      subtitle={
        parentGroup
          ? `الخدمة تابعة للمجموعة: ${parentGroup.name}`
          : 'أضف خدمة جديدة بسعرها الأساسي لتظهر في الكاشير'
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
            <span style={{ fontSize: '1rem' }}>✂️</span>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                المجموعة الحالية
              </span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--accent-service)' }}>
                {parentGroup.name}
              </strong>
            </div>
          </div>
        )}

        <Input
          label="اسم الخدمة"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) setNameError('');
          }}
          placeholder="مثال: قص شعر ملكي، سشوار، تمليس..."
          error={nameError}
          required
          autoFocus
        />

        <PriceInput
          label="السعر الأساسي للخدمة"
          value={price}
          onChange={setPrice}
          required
          helperText="السعر الافتراضي الذي سيظهر في الفاتورة"
        />

        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={allowPriceOverride}
              onChange={(e) => setAllowPriceOverride(e.target.checked)}
              style={{ marginTop: '3px' }}
            />
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                السماح للكاشير بتعديل السعر
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                إذا تم تفعيل هذا الخيار، يستطيع الكاشير تعديل سعر هذه الخدمة مع إلزام كتابة سبب التعديل.
              </span>
            </div>
          </label>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
            حالة الخدمة
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="radio"
                name="service-status"
                value="ACTIVE"
                checked={status === 'ACTIVE'}
                onChange={() => setStatus('ACTIVE')}
              />
              <span>نشطة</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="radio"
                name="service-status"
                value="HIDDEN"
                checked={status === 'HIDDEN'}
                onChange={() => setStatus('HIDDEN')}
              />
              <span>مخفية مؤقتاً</span>
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
            placeholder="ملاحظات تفصيلية لاستخدام المالك..."
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
            {isEditing ? 'حفظ التعديلات' : 'إضافة الخدمة'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
};
