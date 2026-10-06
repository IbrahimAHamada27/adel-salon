'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { promotionsApi, Promotion, CreatePromotionInput } from '@/services/promotions.api';
import { catalogApi } from '@/services/catalog.api';
import { CatalogItem } from '@/types/catalog';
import {
  Gift,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Archive,
  RotateCcw,
  Edit2,
  Calendar,
  Layers,
  ArrowUpDown,
  Tag,
  AlertCircle,
  Clock,
} from 'lucide-react';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'VALID' | 'EXPIRED' | 'SCHEDULED'>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFixedPrice, setFormFixedPrice] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formStartsAt, setFormStartsAt] = useState('');
  const [formEndsAt, setFormEndsAt] = useState('');
  const [formSortOrder, setFormSortOrder] = useState<number>(0);
  const [selectedItems, setSelectedItems] = useState<Array<{ catalogItemId: string; quantity: number }>>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [promos, items] = await Promise.all([
        promotionsApi.getPromotions(),
        catalogApi.getItems(),
      ]);
      setPromotions(promos);
      setCatalogItems(items);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل تحميل بيانات العروض');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingPromotion(null);
    setFormName('');
    setFormDescription('');
    setFormFixedPrice(0);
    setFormStatus('ACTIVE');
    setFormStartsAt('');
    setFormEndsAt('');
    setFormSortOrder(promotions.length);
    setSelectedItems([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (promo: Promotion) => {
    setEditingPromotion(promo);
    setFormName(promo.name);
    setFormDescription(promo.description || '');
    setFormFixedPrice(promo.fixedPrice);
    setFormStatus(promo.status === 'ARCHIVED' ? 'INACTIVE' : promo.status);
    setFormStartsAt(promo.startsAt ? promo.startsAt.slice(0, 16) : '');
    setFormEndsAt(promo.endsAt ? promo.endsAt.slice(0, 16) : '');
    setFormSortOrder(promo.sortOrder);
    setSelectedItems(
      promo.items.map((i) => ({
        catalogItemId: i.catalogItemId,
        quantity: i.quantity,
      })),
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddItemToForm = (catalogItemId: string) => {
    if (!catalogItemId) return;
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.catalogItemId === catalogItemId);
      if (existing) {
        return prev.map((i) => (i.catalogItemId === catalogItemId ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { catalogItemId, quantity: 1 }];
    });
  };

  const handleUpdateItemQuantity = (catalogItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedItems((prev) => prev.filter((i) => i.catalogItemId !== catalogItemId));
    } else {
      setSelectedItems((prev) =>
        prev.map((i) => (i.catalogItemId === catalogItemId ? { ...i, quantity } : i)),
      );
    }
  };

  const handleRemoveItemFromForm = (catalogItemId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.catalogItemId !== catalogItemId));
  };

  // Calculate sum of regular prices for selected items
  const regularTotal = useMemo(() => {
    return selectedItems.reduce((sum, si) => {
      const cat = catalogItems.find((c) => c.id === si.catalogItemId);
      return sum + (cat ? cat.price * si.quantity : 0);
    }, 0);
  }, [selectedItems, catalogItems]);

  const savingsAmount = regularTotal - formFixedPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('اسم العرض إجباري');
      return;
    }

    if (formFixedPrice < 0) {
      setFormError('سعر العرض لا يمكن أن يكون سالباً');
      return;
    }

    if (selectedItems.length === 0) {
      setFormError('يجب اختيار عنصر واحد على الأقل من الكتالوج');
      return;
    }

    if (formStartsAt && formEndsAt && new Date(formEndsAt) < new Date(formStartsAt)) {
      setFormError('تاريخ نهاية العرض لا يمكن أن يسبق تاريخ البداية');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreatePromotionInput = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        fixedPrice: Number(formFixedPrice),
        status: formStatus,
        startsAt: formStartsAt ? new Date(formStartsAt).toISOString() : undefined,
        endsAt: formEndsAt ? new Date(formEndsAt).toISOString() : undefined,
        sortOrder: Number(formSortOrder),
        items: selectedItems.map((item, idx) => ({
          catalogItemId: item.catalogItemId,
          quantity: item.quantity,
          sortOrder: idx,
        })),
      };

      if (editingPromotion) {
        await promotionsApi.updatePromotion(editingPromotion.id, payload);
      } else {
        await promotionsApi.createPromotion(payload);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'فشل حفظ العرض');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في أرشفة هذا العرض؟')) return;
    try {
      await promotionsApi.archivePromotion(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'فشل أرشفة العرض');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await promotionsApi.restorePromotion(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'فشل استعادة العرض');
    }
  };

  const filteredPromotions = promotions.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = (p.description || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }

    const now = new Date();
    if (statusFilter === 'ACTIVE') return p.status === 'ACTIVE';
    if (statusFilter === 'INACTIVE') return p.status === 'INACTIVE';
    if (statusFilter === 'ARCHIVED') return p.status === 'ARCHIVED';
    if (statusFilter === 'VALID') {
      if (p.status !== 'ACTIVE') return false;
      if (p.startsAt && new Date(p.startsAt) > now) return false;
      if (p.endsAt && new Date(p.endsAt) < now) return false;
      return true;
    }
    if (statusFilter === 'EXPIRED') {
      return p.endsAt ? new Date(p.endsAt) < now : false;
    }
    if (statusFilter === 'SCHEDULED') {
      return p.startsAt ? new Date(p.startsAt) > now : false;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Gift style={{ color: 'var(--accent-primary)' }} />
            العروض والباقات
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            إنشاء باقات مجمعة بسعر ثابت، وتحديد فترات التفعيل ومزامنتها تلقائياً مع الكاشير.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Plus size={18} />
          إضافة عرض جديد
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          backgroundColor: 'var(--bg-surface)',
          padding: '16px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="بحث باسم العرض أو الوصف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 36px 8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e: any) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-app)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          <option value="ALL">جميع العروض ({promotions.length})</option>
          <option value="ACTIVE">نشط</option>
          <option value="INACTIVE">غير نشط</option>
          <option value="VALID">صالح حالياً</option>
          <option value="SCHEDULED">مجدول لاحقاً</option>
          <option value="EXPIRED">منتهي</option>
          <option value="ARCHIVED">مؤرشف</option>
        </select>
      </div>

      {/* Promotions Table */}
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          جاري تحميل العروض والباقات...
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-subtle)',
          }}
        >
          <Gift size={48} style={{ margin: '0 auto 16px', color: 'var(--text-secondary)', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            لا توجد عروض وباقات مسجلة
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 16px' }}>
            يمكنك إنشاء أول باقة عروض مخصصة لتظهر مباشرة على شاشات الكاشير.
          </p>
          <button
            onClick={openCreateModal}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-primary)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            إضافة عرض الآن
          </button>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>اسم العرض</th>
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>المكونات</th>
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>السعر الثابت</th>
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>فترة الصلاحية</th>
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>الحالة</th>
                <th style={{ padding: '14px 16px', fontWeight: 800, textAlign: 'center' }}>الترتيب</th>
                <th style={{ padding: '14px 16px', fontWeight: 800, textAlign: 'left' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredPromotions.map((promo) => {
                const now = new Date();
                const isExpired = promo.endsAt ? new Date(promo.endsAt) < now : false;
                const isScheduled = promo.startsAt ? new Date(promo.startsAt) > now : false;

                return (
                  <tr
                    key={promo.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {promo.name}
                      </div>
                      {promo.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {promo.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {promo.items.map((it, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'var(--bg-app)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {it.quantity > 1 ? `${it.quantity}× ` : ''}{it.catalogItemNameSnapshot}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 900, color: 'var(--accent-primary)', fontSize: '1rem' }}>
                      {promo.fixedPrice.toFixed(2)} ج.م
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {promo.startsAt || promo.endsAt ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {promo.startsAt && <span>من: {new Date(promo.startsAt).toLocaleDateString('ar-EG')}</span>}
                          {promo.endsAt && <span>إلى: {new Date(promo.endsAt).toLocaleDateString('ar-EG')}</span>}
                          {isExpired && <span style={{ color: 'var(--danger)', fontWeight: 700 }}>منتهي</span>}
                          {isScheduled && <span style={{ color: 'var(--warning)', fontWeight: 700 }}>مجدول</span>}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>دائم ومستمر</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {promo.status === 'ARCHIVED' ? (
                        <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                          مؤرشف
                        </span>
                      ) : promo.status === 'ACTIVE' ? (
                        <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                          نشط
                        </span>
                      ) : (
                        <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                          غير نشط
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {promo.sortOrder}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'left' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {promo.status !== 'ARCHIVED' ? (
                          <>
                            <button
                              onClick={() => openEditModal(promo)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--bg-app)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Edit2 size={12} />
                              تعديل
                            </button>
                            <button
                              onClick={() => handleArchive(promo.id)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              أرشفة
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRestore(promo.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.2)',
                              color: '#22c55e',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <RotateCcw size={12} />
                            استعادة
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gift size={20} style={{ color: 'var(--accent-primary)' }} />
                {editingPromotion ? 'تعديل باقة العرض' : 'إضافة عرض / باقة جديدة'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formError && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  {formError}
                </div>
              )}

              {/* Name & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    اسم العرض / الباقة *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: باقة العناية الشاملة"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-app)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    حالة العرض
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e: any) => setFormStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-app)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    <option value="ACTIVE">نشط</option>
                    <option value="INACTIVE">غير نشط</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  وصف داخلي (اختياري)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="ملاحظات توضيحية للإدارة..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              {/* Items Selector */}
              <div style={{ backgroundColor: 'var(--bg-app)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  عناصر الباقة (الخدمات والمنتجات) *
                </label>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <select
                    id="catalog-picker"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItemToForm(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="">-- اضغط لاختيار خدمة أو منتج لإضافته للباقة --</option>
                    {catalogItems
                      .filter((c) => c.status !== 'ARCHIVED')
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.type === 'SERVICE' ? '✂️ خدمة: ' : '🧴 منتج: '}
                          {cat.name} ({cat.price} ج.م)
                        </option>
                      ))}
                  </select>
                </div>

                {selectedItems.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px' }}>
                    لم يتم إضافة أي عناصر بعد. اختر خدمات أو منتجات أعلاه.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedItems.map((si) => {
                      const cat = catalogItems.find((c) => c.id === si.catalogItemId);
                      if (!cat) return null;

                      return (
                        <div
                          key={si.catalogItemId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'var(--bg-surface)',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                              {cat.name}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '8px' }}>
                              ({cat.price} ج.م للوحدة)
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(si.catalogItemId, si.quantity - 1)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: 'var(--bg-app)',
                                  border: '1px solid var(--border-subtle)',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer',
                                }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>
                                {si.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(si.catalogItemId, si.quantity + 1)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: 'var(--bg-app)',
                                  border: '1px solid var(--border-subtle)',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer',
                                }}
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItemFromForm(si.catalogItemId)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                              }}
                            >
                              حذف
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Price & Savings Comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    السعر الثابت للباقة (ج.م) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={formFixedPrice}
                    onChange={(e) => setFormFixedPrice(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-app)',
                      color: 'var(--accent-primary)',
                      fontWeight: 900,
                      fontSize: '1rem',
                    }}
                  />
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-app)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    مجموع السعر العادي: <strong style={{ color: 'var(--text-primary)' }}>{regularTotal.toFixed(2)} ج.م</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '2px', color: savingsAmount >= 0 ? '#22c55e' : '#ef4444' }}>
                    {savingsAmount >= 0
                      ? `مقدار التوفير للعميل: ${savingsAmount.toFixed(2)} ج.م`
                      : `زيادة عن السعر العادي: ${Math.abs(savingsAmount).toFixed(2)} ج.م`}
                  </div>
                </div>
              </div>

              {/* StartsAt & EndsAt */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    تاريخ البداية (اختياري)
                  </label>
                  <input
                    type="datetime-local"
                    value={formStartsAt}
                    onChange={(e) => setFormStartsAt(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-app)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    تاريخ النهاية (اختياري)
                  </label>
                  <input
                    type="datetime-local"
                    value={formEndsAt}
                    onChange={(e) => setFormEndsAt(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-app)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 24px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--accent-primary)',
                    color: '#fff',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {isSubmitting ? 'جاري الحفظ...' : editingPromotion ? 'حفظ التعديلات' : 'إنشاء العرض'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
