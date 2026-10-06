'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { bookingsApi, Booking, CreateBookingInput } from '@/services/bookings.api';
import { catalogApi } from '@/services/catalog.api';
import { CatalogItem } from '@/types/catalog';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Scissors,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRightLeft,
  Edit2,
  AlertCircle,
  Eye,
  Check,
} from 'lucide-react';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string; roleTitle?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'TOMORROW' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [barberFilter, setBarberFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  // Form State
  const [customerType, setCustomerType] = useState<'GUEST' | 'REGISTERED'>('GUEST');
  const [formGuestName, setFormGuestName] = useState('');
  const [formGuestPhone, setFormGuestPhone] = useState('');
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formScheduledAt, setFormScheduledAt] = useState('');
  const [formPreferredEmployeeId, setFormPreferredEmployeeId] = useState('');
  const [formInternalNote, setFormInternalNote] = useState('');
  const [formSelectedItems, setFormSelectedItems] = useState<Array<{ catalogItemId: string; quantity: number }>>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cancel Reason Modal
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bList, cItems, staffRes] = await Promise.all([
        bookingsApi.getBookings(),
        catalogApi.getItems(),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/staff/employees`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('tech_auth_token') || ''}`,
          },
        }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);
      setBookings(bList);
      setCatalogItems(cItems);
      setEmployees(staffRes);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingBooking(null);
    setCustomerType('GUEST');
    setFormGuestName('');
    setFormGuestPhone('');
    setFormCustomerId('');
    const d = new Date();
    d.setMinutes(d.getMinutes() + 60);
    setFormScheduledAt(d.toISOString().slice(0, 16));
    setFormPreferredEmployeeId('');
    setFormInternalNote('');
    setFormSelectedItems([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (b: Booking) => {
    setEditingBooking(b);
    if (b.customerId) {
      setCustomerType('REGISTERED');
      setFormCustomerId(b.customerId);
    } else {
      setCustomerType('GUEST');
      setFormGuestName(b.guestName || '');
      setFormGuestPhone(b.guestPhone || '');
    }
    setFormScheduledAt(b.scheduledAt ? b.scheduledAt.slice(0, 16) : '');
    setFormPreferredEmployeeId(b.preferredEmployeeId || '');
    setFormInternalNote(b.internalNote || '');
    setFormSelectedItems(
      b.items?.map((i) => ({ catalogItemId: i.catalogItemId, quantity: i.quantity })) || [],
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formScheduledAt) {
      setFormError('موعد الحجز إجباري');
      return;
    }

    if (customerType === 'GUEST' && !formGuestName.trim()) {
      setFormError('اسم الضيف / العميل إجباري');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = formSelectedItems.map((si, idx) => {
        const cat = catalogItems.find((c) => c.id === si.catalogItemId);
        return {
          catalogItemId: si.catalogItemId,
          itemNameSnapshot: cat ? cat.name : 'خدمة',
          itemType: (cat ? cat.type : 'SERVICE') as 'SERVICE' | 'PRODUCT',
          quantity: si.quantity,
          sortOrder: idx,
        };
      });

      const payload: CreateBookingInput = {
        customerId: customerType === 'REGISTERED' ? formCustomerId : undefined,
        guestName: customerType === 'GUEST' ? formGuestName.trim() : undefined,
        guestPhone: customerType === 'GUEST' ? formGuestPhone.trim() : undefined,
        scheduledAt: new Date(formScheduledAt).toISOString(),
        preferredEmployeeId: formPreferredEmployeeId || undefined,
        internalNote: formInternalNote.trim() || undefined,
        items: itemsPayload.length > 0 ? itemsPayload : undefined,
      };

      if (editingBooking) {
        await bookingsApi.updateBooking(editingBooking.id, payload);
      } else {
        await bookingsApi.createBooking(payload);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'فشل حفظ الحجز');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: string, reason?: string) => {
    try {
      await bookingsApi.updateStatus(id, status, reason);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'فشل تغيير حالة الحجز');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetId) return;
    await handleStatusChange(cancelTargetId, 'CANCELLED', cancelReason.trim() || undefined);
    setCancelTargetId(null);
    setCancelReason('');
  };

  // Helper to detect if same barber has overlapping appointments (Non-blocking visual indicator)
  const isBarberOverlapping = (currentBooking: Booking) => {
    if (!currentBooking.preferredEmployeeId) return false;
    const currentStart = new Date(currentBooking.scheduledAt).getTime();
    const currentEnd = currentStart + 30 * 60 * 1000; // default 30 min window

    return bookings.some((other) => {
      if (other.id === currentBooking.id) return false;
      if (other.preferredEmployeeId !== currentBooking.preferredEmployeeId) return false;
      if (other.status === 'CANCELLED' || other.status === 'NO_SHOW') return false;

      const otherStart = new Date(other.scheduledAt).getTime();
      const otherEnd = otherStart + 30 * 60 * 1000;
      return Math.max(currentStart, otherStart) < Math.min(currentEnd, otherEnd);
    });
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
      if (barberFilter !== 'ALL' && b.preferredEmployeeId !== barberFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchGuest = (b.guestName || '').toLowerCase().includes(q);
        const matchPhone = (b.guestPhone || '').includes(q);
        const matchCust = (b.customerName || '').toLowerCase().includes(q);
        const matchNote = (b.internalNote || '').toLowerCase().includes(q);
        if (!matchGuest && !matchPhone && !matchCust && !matchNote) return false;
      }

      const bDate = new Date(b.scheduledAt);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      if (dateFilter === 'TODAY') {
        return bDate >= todayStart && bDate <= todayEnd;
      }
      if (dateFilter === 'TOMORROW') {
        const tomStart = new Date(todayStart);
        tomStart.setDate(tomStart.getDate() + 1);
        const tomEnd = new Date(todayEnd);
        tomEnd.setDate(tomEnd.getDate() + 1);
        return bDate >= tomStart && bDate <= tomEnd;
      }
      if (dateFilter === 'CUSTOM') {
        if (customStartDate && bDate < new Date(customStartDate)) return false;
        if (customEndDate && bDate > new Date(customEndDate)) return false;
      }

      return true;
    });
  }, [bookings, statusFilter, barberFilter, searchQuery, dateFilter, customStartDate, customEndDate]);

  const STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
    CONFIRMED: { label: 'مؤكد', bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
    ARRIVED: { label: 'حضر', bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
    NO_SHOW: { label: 'لم يحضر', bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
    CANCELLED: { label: 'ملغي', bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
    CONVERTED_TO_INVOICE: { label: 'تم التحويل لفاتورة', bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar style={{ color: 'var(--accent-primary)' }} />
            إدارة الحجوزات والمواعيد
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            متابعة حجوزات الزبائن، تعيين الحلاقين، وتحويل الحجز إلى فاتورة بيع عند الحضور.
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
          إضافة حجز جديد
        </button>
      </div>

      {/* Filter Bar */}
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
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف..."
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

        {/* Date Filter Tabs */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-app)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          {(['ALL', 'TODAY', 'TOMORROW', 'CUSTOM'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setDateFilter(mode)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: dateFilter === mode ? 'var(--accent-primary)' : 'transparent',
                color: dateFilter === mode ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {mode === 'ALL' ? 'الكل' : mode === 'TODAY' ? 'اليوم' : mode === 'TOMORROW' ? 'غداً' : 'مخصص'}
            </button>
          ))}
        </div>

        {dateFilter === 'CUSTOM' && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.75rem' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>إلى</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.75rem' }}
            />
          </div>
        )}

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-app)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          <option value="ALL">جميع الحالات ({bookings.length})</option>
          <option value="CONFIRMED">مؤكد</option>
          <option value="ARRIVED">حضر</option>
          <option value="CONVERTED_TO_INVOICE">تم التحويل لفاتورة</option>
          <option value="NO_SHOW">لم يحضر</option>
          <option value="CANCELLED">ملغي</option>
        </select>

        <select
          value={barberFilter}
          onChange={(e) => setBarberFilter(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-app)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          <option value="ALL">كل الحلاقين</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
      </div>

      {/* Bookings List Table */}
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          جاري تحميل الحجوزات...
        </div>
      ) : filteredBookings.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-subtle)',
          }}
        >
          <Calendar size={48} style={{ margin: '0 auto 16px', color: 'var(--text-secondary)', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            لا توجد حجوزات مسجلة
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 16px' }}>
            سجل المواعيد فارغ تماماً. يمكنك إضافة حجز جديد وسيزامن تلقائياً مع الكاشير.
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
            إضافة حجز الآن
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
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>الموعد والتاريخ</th>
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>العميل / الضيف</th>
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>الخدمات المطلوبة</th>
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>الحلاق المفضل</th>
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>الحالة</th>
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>المصدر</th>
                <th style={{ padding: '14px 16px', fontWeight: 800, textAlign: 'left' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => {
                const displayName = b.guestName || b.customerName || 'عميل';
                const displayPhone = b.guestPhone || null;
                const barber = employees.find((e) => e.id === b.preferredEmployeeId);
                const hasOverlap = isBarberOverlapping(b);
                const badge = STATUS_BADGES[b.status] || STATUS_BADGES.CONFIRMED;

                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} style={{ color: 'var(--accent-primary)' }} />
                        {new Date(b.scheduledAt).toLocaleString('ar-EG', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{displayName}</div>
                      {displayPhone && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', direction: 'ltr', textAlign: 'right' }}>
                          {displayPhone}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      {b.items && b.items.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {b.items.map((item, idx) => (
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
                              {item.itemNameSnapshot}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>غير محدد مسبقاً</span>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Scissors size={14} style={{ color: 'var(--text-secondary)' }} />
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {barber ? barber.name : 'أي حلاق متاح'}
                        </span>
                        {hasOverlap && (
                          <span
                            title="تنبيه: يوجد حجز آخر لهذا الحلاق في نفس الوقت تقريباً (غير مانع)"
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(245, 158, 11, 0.2)',
                              color: '#f59e0b',
                              fontWeight: 800,
                              cursor: 'help',
                            }}
                          >
                            تداخل موعد
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          backgroundColor: badge.bg,
                          color: badge.text,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {b.createdFrom === 'ADMIN' ? 'لوحة المالك' : 'تطبيق الكاشير'}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'left' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {b.status === 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(b.id, 'ARRIVED')}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                color: '#22c55e',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              حضر
                            </button>
                            <button
                              onClick={() => handleStatusChange(b.id, 'NO_SHOW')}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                color: '#f59e0b',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              لم يحضر
                            </button>
                          </>
                        )}

                        {b.status !== 'CANCELLED' && b.status !== 'CONVERTED_TO_INVOICE' && (
                          <>
                            <button
                              onClick={() => openEditModal(b)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--bg-app)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => setCancelTargetId(b.id)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              إلغاء
                            </button>
                          </>
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
              maxWidth: '600px',
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
                <Calendar size={20} style={{ color: 'var(--accent-primary)' }} />
                {editingBooking ? 'تعديل بيانات الحجز' : 'إضافة حجز موعد جديد'}
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

              {/* Customer Type Tabs */}
              <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--bg-app)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setCustomerType('GUEST')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: customerType === 'GUEST' ? 'var(--accent-primary)' : 'transparent',
                    color: customerType === 'GUEST' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  عميل ضيف / سريع
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerType('REGISTERED')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: customerType === 'REGISTERED' ? 'var(--accent-primary)' : 'transparent',
                    color: customerType === 'REGISTERED' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  عميل مسجل
                </button>
              </div>

              {customerType === 'GUEST' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                      اسم العميل / الضيف *
                    </label>
                    <input
                      type="text"
                      required
                      value={formGuestName}
                      onChange={(e) => setFormGuestName(e.target.value)}
                      placeholder="مثال: كريم عادل"
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
                      رقم الموبايل (اختياري)
                    </label>
                    <input
                      type="tel"
                      value={formGuestPhone}
                      onChange={(e) => setFormGuestPhone(e.target.value)}
                      placeholder="01xxxxxxxxx"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'var(--bg-app)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        direction: 'ltr',
                        textAlign: 'right',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    معرف العميل المسجل
                  </label>
                  <input
                    type="text"
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(e.target.value)}
                    placeholder="أدخل كود أو معرف العميل..."
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
              )}

              {/* Scheduled Date & Preferred Barber */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    موعد الحجز *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formScheduledAt}
                    onChange={(e) => setFormScheduledAt(e.target.value)}
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
                    الحلاق المفضل (اختياري)
                  </label>
                  <select
                    value={formPreferredEmployeeId}
                    onChange={(e) => setFormPreferredEmployeeId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-app)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="">أي حلاق متاح</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.roleTitle || 'حلاق'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Internal Note */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  ملاحظات داخلية (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={formInternalNote}
                  onChange={(e) => setFormInternalNote(e.target.value)}
                  placeholder="ملاحظات تنظيمية خاصة بالمحل..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    resize: 'none',
                  }}
                />
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
                  {isSubmitting ? 'جاري الحفظ...' : editingBooking ? 'حفظ التعديلات' : 'تسجيل الحجز'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Reason Modal */}
      {cancelTargetId && (
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
              maxWidth: '450px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ef4444' }}>
              تأكيد إلغاء الحجز
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              هل ترغب في تسجيل سبب للإلغاء في سجل النشاط؟
            </p>
            <input
              type="text"
              placeholder="سبب الإلغاء (اختياري)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setCancelTargetId(null)}
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
                رجوع
              </button>
              <button
                onClick={handleConfirmCancel}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                تأكيد الإلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
