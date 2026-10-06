import React, { useState, useEffect } from 'react';
import { LocalBooking, CreateLocalBookingPayload, BookingStatus } from '../../types/booking';
import { LocalCatalogItem } from '../../types/catalog';
import { LocalEmployee } from '../../types/employee';
import { LocalPromotion } from '../../types/promotion';
import { LocalCustomer } from '../../types/customer';
import { NativeBridge } from '../../services/nativeBridge';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Scissors,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRightLeft,
  Plus,
  Search,
  X,
  FileText,
  UserPlus,
  Loader2,
} from 'lucide-react';

interface BookingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeShiftLocalId: string | null;
  cashierId: string;
  catalogItems: LocalCatalogItem[];
  promotions: LocalPromotion[];
  employees: LocalEmployee[];
  onBookingConverted: (invoiceLocalId: string) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

const STATUS_LABELS: Record<BookingStatus, { label: string; color: string; icon: any }> = {
  CONFIRMED: { label: 'مؤكد', color: 'bg-blue-950/60 text-blue-300 border-blue-800/60', icon: Clock },
  ARRIVED: { label: 'حضر', color: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60', icon: CheckCircle2 },
  NO_SHOW: { label: 'لم يحضر', color: 'bg-amber-950/60 text-amber-300 border-amber-800/60', icon: AlertTriangle },
  CANCELLED: { label: 'ملغي', color: 'bg-red-950/60 text-red-300 border-red-800/60', icon: XCircle },
  CONVERTED_TO_INVOICE: { label: 'تم التحويل لفاتورة', color: 'bg-purple-950/60 text-purple-300 border-purple-800/60', icon: ArrowRightLeft },
};

export const BookingsDrawer: React.FC<BookingsDrawerProps> = ({
  isOpen,
  onClose,
  activeShiftLocalId,
  cashierId,
  catalogItems,
  promotions,
  employees,
  onBookingConverted,
  showToast,
}) => {
  const [bookings, setBookings] = useState<LocalBooking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // New Booking Form State
  const [customerType, setCustomerType] = useState<'GUEST' | 'REGISTERED'>('GUEST');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [preferredEmployeeId, setPreferredEmployeeId] = useState<string>('');
  const [internalNote, setInternalNote] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  const [existingCustomers, setExistingCustomers] = useState<LocalCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const list = await NativeBridge.getUpcomingBookings();
      setBookings(list);
    } catch (err: any) {
      console.error('Failed to load bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const custs = await NativeBridge.searchCustomers('');
      setExistingCustomers(custs);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBookings();
      loadCustomers();
      // Set default scheduled time to now + 30 mins
      const d = new Date();
      d.setMinutes(d.getMinutes() + 30);
      setScheduledAt(d.toISOString().slice(0, 16));
    }
  }, [isOpen]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt) {
      showToast('يرجى تحديد موعد الحجز', 'warning');
      return;
    }

    if (customerType === 'GUEST' && !guestName.trim()) {
      showToast('يرجى إدخال اسم العميل/الضيف', 'warning');
      return;
    }

    if (customerType === 'REGISTERED' && !selectedCustomerId) {
      showToast('يرجى اختيار العميل المسجل', 'warning');
      return;
    }

    try {
      const items: any[] = [];
      if (selectedItemId) {
        const cat = catalogItems.find((c) => c.id === selectedItemId);
        if (cat) {
          items.push({
            catalog_item_id: cat.id,
            item_name_snapshot: cat.name,
            item_type: cat.type,
            quantity: 1,
            sort_order: 0,
          });
        }
      }

      const payload: CreateLocalBookingPayload = {
        customer_local_id: customerType === 'REGISTERED' ? selectedCustomerId : undefined,
        guest_name: customerType === 'GUEST' ? guestName.trim() : undefined,
        guest_phone: customerType === 'GUEST' ? guestPhone.trim() : undefined,
        scheduled_at: new Date(scheduledAt).toISOString(),
        preferred_employee_id: preferredEmployeeId || undefined,
        internal_note: internalNote.trim() || undefined,
        items: items.length > 0 ? items : undefined,
      };

      await NativeBridge.createBooking(payload, cashierId);
      showToast('تم تسجيل الحجز بنجاح', 'success');
      setIsCreating(false);
      setGuestName('');
      setGuestPhone('');
      setSelectedItemId('');
      setPreferredEmployeeId('');
      setInternalNote('');
      await loadBookings();
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ الحجز', 'warning');
    }
  };

  const handleStatusChange = async (bookingId: string, status: BookingStatus) => {
    try {
      await NativeBridge.updateBookingStatus(bookingId, status);
      showToast('تم تحديث حالة الحجز', 'info');
      await loadBookings();
    } catch (err: any) {
      showToast(err.message || 'فشل تحديث الحالة', 'warning');
    }
  };

  const handleConvertToInvoice = async (booking: LocalBooking) => {
    if (!activeShiftLocalId) {
      showToast('يجب فتح وردية أولاً لتحويل الحجز إلى فاتورة', 'warning');
      return;
    }

    if (booking.status === 'CONVERTED_TO_INVOICE' || booking.converted_invoice_id) {
      showToast('تم تحويل هذا الحجز إلى فاتورة بالفعل', 'warning');
      return;
    }

    try {
      const invoice = await NativeBridge.convertBookingToInvoice(
        booking.local_id,
        activeShiftLocalId,
        catalogItems,
        promotions,
        cashierId,
      );
      showToast(`تم تحويل الحجز إلى الفاتورة #${invoice.invoice_number_local}`, 'success');
      await loadBookings();
      onBookingConverted(invoice.local_id);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'فشل تحويل الحجز إلى فاتورة', 'warning');
    }
  };

  if (!isOpen) return null;

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (b.guest_name || '').toLowerCase().includes(q);
      const phoneMatch = (b.guest_phone || '').includes(q);
      const noteMatch = (b.internal_note || '').toLowerCase().includes(q);
      const cust = existingCustomers.find((c) => c.local_id === b.customer_local_id);
      const custMatch = cust ? cust.full_name.toLowerCase().includes(q) || (cust.phone_number || '').includes(q) : false;
      return nameMatch || phoneMatch || noteMatch || custMatch;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-neutral-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-xl bg-neutral-900 border-r border-neutral-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-950/70 border border-blue-800/60 flex items-center justify-center text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-neutral-100">سجل الحجوزات والمواعيد</h2>
              <p className="text-xs text-neutral-400">إدارة الحجوزات القادمة وتحويلها لفواتير فورية</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreating ? 'عرض القائمة' : 'حجز جديد'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isCreating ? (
            /* Create New Booking Form */
            <form onSubmit={handleCreateBooking} className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-4 space-y-4">
              <h3 className="text-sm font-black text-blue-400 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>إضافة حجز جديد (يعمل بدون إنترنت)</span>
              </h3>

              {/* Customer Type Tabs */}
              <div className="flex gap-2 p-1 bg-neutral-900 rounded-xl border border-neutral-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCustomerType('GUEST')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    customerType === 'GUEST' ? 'bg-blue-600 text-white shadow' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  عميل ضيف / سريع
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerType('REGISTERED')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    customerType === 'REGISTERED' ? 'bg-blue-600 text-white shadow' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  عميل مسجل
                </button>
              </div>

              {customerType === 'GUEST' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-neutral-300 block mb-1">اسم الضيف *</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="مثال: أحمد مصطفى"
                      className="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-300 block mb-1">رقم الموبايل (اختياري)</label>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="01xxxxxxxxx"
                      className="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500 text-left font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">اختر العميل المسجل *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">-- اختر العميل --</option>
                    {existingCustomers.map((c) => (
                      <option key={c.local_id} value={c.local_id}>
                        {c.full_name} ({c.phone_number || 'بدون هاتف'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date and Time */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">موعد الحجز *</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>

              {/* Preferred Barber */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">الحلاق المفضل (اختياري)</label>
                  <select
                    value={preferredEmployeeId}
                    onChange={(e) => setPreferredEmployeeId(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">أي حلاق متاح</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role_title || 'حلاق'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">الخدمة المطلوبة (اختياري)</label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- بدون تحديد مسبق --</option>
                    {catalogItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.base_price} ج.م)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Internal Note */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">ملاحظات داخلية (اختياري)</label>
                <input
                  type="text"
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="ملاحظات تفضيلية للعميل..."
                  className="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg transition-all cursor-pointer"
                >
                  حفظ الحجز
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Search & Filters Bar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالاسم أو الهاتف..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pr-9 pl-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-bold text-neutral-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">كل الحالات</option>
                  <option value="CONFIRMED">مؤكد</option>
                  <option value="ARRIVED">حضر</option>
                  <option value="CONVERTED_TO_INVOICE">تم التحويل</option>
                  <option value="NO_SHOW">لم يحضر</option>
                  <option value="CANCELLED">ملغي</option>
                </select>
              </div>

              {/* Bookings List */}
              {isLoading ? (
                <div className="py-12 flex justify-center items-center text-neutral-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 border border-dashed border-neutral-800 rounded-2xl">
                  <Calendar className="w-10 h-10 mx-auto text-neutral-600 mb-2" />
                  <p className="text-sm font-bold text-neutral-400">لا توجد حجوزات مطابقة</p>
                  <p className="text-xs text-neutral-600 mt-1">يمكنك إضافة حجز جديد في أي وقت</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBookings.map((b) => {
                    const statusMeta = STATUS_LABELS[b.status] || STATUS_LABELS.CONFIRMED;
                    const StatusIcon = statusMeta.icon;
                    const barber = employees.find((e) => e.id === b.preferred_employee_id);
                    const cust = existingCustomers.find((c) => c.local_id === b.customer_local_id);
                    const displayName = b.guest_name || (cust ? cust.full_name : 'عميل غير محدد');
                    const displayPhone = b.guest_phone || (cust ? cust.phone_number : null);

                    const isConvertible = b.status !== 'CONVERTED_TO_INVOICE' && b.status !== 'CANCELLED';

                    return (
                      <div
                        key={b.local_id}
                        className="bg-neutral-950/80 border border-neutral-800/80 rounded-2xl p-4 transition-all hover:border-neutral-700"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-neutral-100">{displayName}</span>
                              {b.customer_local_id && (
                                <span className="text-[10px] bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/40">
                                  مسجل
                                </span>
                              )}
                            </div>
                            {displayPhone && (
                              <div className="text-xs text-neutral-400 font-mono flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />
                                <span>{displayPhone}</span>
                              </div>
                            )}
                          </div>

                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full border flex items-center gap-1 ${statusMeta.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            <span>{statusMeta.label}</span>
                          </span>
                        </div>

                        {/* Timing and Barber Info */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400 bg-neutral-900/60 rounded-xl p-2.5 mb-3 border border-neutral-800/50">
                          <div className="flex items-center gap-1.5 font-mono text-neutral-300">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            <span>
                              {new Date(b.scheduled_at).toLocaleString('ar-EG', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-neutral-300">
                            <Scissors className="w-3.5 h-3.5 text-amber-400" />
                            <span>{barber ? barber.name : 'أي حلاق متاح'}</span>
                          </div>
                        </div>

                        {/* Items Snapshot */}
                        {b.items && b.items.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-1.5">
                            {b.items.map((item, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-neutral-900 text-neutral-300 px-2 py-0.5 rounded-lg border border-neutral-800"
                              >
                                {item.item_name_snapshot}
                              </span>
                            ))}
                          </div>
                        )}

                        {b.internal_note && (
                          <p className="text-xs text-neutral-400 italic mb-3">"{b.internal_note}"</p>
                        )}

                        {/* Actions Row */}
                        <div className="flex items-center justify-between pt-2 border-t border-neutral-900 gap-2">
                          <div className="flex items-center gap-1.5">
                            {b.status === 'CONFIRMED' && (
                              <button
                                onClick={() => handleStatusChange(b.local_id, 'ARRIVED')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/40 text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                تأكيد الحضور
                              </button>
                            )}
                            {b.status === 'CONFIRMED' && (
                              <button
                                onClick={() => handleStatusChange(b.local_id, 'NO_SHOW')}
                                className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                لم يحضر
                              </button>
                            )}
                            {b.status !== 'CANCELLED' && b.status !== 'CONVERTED_TO_INVOICE' && (
                              <button
                                onClick={() => handleStatusChange(b.local_id, 'CANCELLED')}
                                className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-red-950/40 text-neutral-400 hover:text-red-300 border border-neutral-800 text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                إلغاء
                              </button>
                            )}
                          </div>

                          {isConvertible && (
                            <button
                              onClick={() => handleConvertToInvoice(b)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              <span>تحويل إلى فاتورة</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
