import React, { useState, useEffect, useCallback } from 'react';
import { LocalInvoice } from '../../types/sales';
import { NativeBridge } from '../../services/nativeBridge';
import {
  X,
  FileCheck,
  Printer,
  Receipt,
  RotateCcw,
  Clock,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Search,
  Filter,
} from 'lucide-react';

interface ShiftInvoicesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeShiftLocalId: string | null;
  cashierUserId?: string;
  onSelectInvoiceForReprint: (invoice: LocalInvoice) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

const REFUND_REASONS = [
  'طلب العميل واسترداد المبلغ',
  'خطأ في الحساب أو التسعير',
  'إلغاء الخدمة بعد السداد',
  'عدم رضا العميل عن الخدمة',
  'أخرى (سبب مخصص)',
];

export const ShiftInvoicesDrawer: React.FC<ShiftInvoicesDrawerProps> = ({
  isOpen,
  onClose,
  activeShiftLocalId,
  cashierUserId = 'cashier-1',
  onSelectInvoiceForReprint,
  showToast,
}) => {
  const [invoices, setInvoices] = useState<LocalInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'PAID' | 'REFUNDED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Refund Modal State
  const [refundTargetInvoice, setRefundTargetInvoice] = useState<LocalInvoice | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(REFUND_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [isRefunding, setIsRefunding] = useState(false);

  const loadPaidInvoices = useCallback(async () => {
    if (!activeShiftLocalId) return;
    setIsLoading(true);
    try {
      const data = await NativeBridge.getActiveShiftPaidInvoices(activeShiftLocalId);
      setInvoices(data);
    } catch (err: any) {
      console.error('Failed to load active shift invoices:', err);
      showToast(err.message || 'فشل تحميل فواتير الوردية', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [activeShiftLocalId, showToast]);

  useEffect(() => {
    if (isOpen && activeShiftLocalId) {
      loadPaidInvoices();
    }
  }, [isOpen, activeShiftLocalId, loadPaidInvoices]);

  if (!isOpen) return null;

  const paidInvoices = invoices.filter((i) => i.status === 'PAID');
  const refundedInvoices = invoices.filter((i) => i.status === 'REFUNDED');

  const totalPaidAmount = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalRefundedAmount = refundedInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const netSalesAmount = totalPaidAmount;

  // Filter & Search
  const filteredInvoices = invoices.filter((inv) => {
    // Tab Filter
    if (filterTab === 'PAID' && inv.status !== 'PAID') return false;
    if (filterTab === 'REFUNDED' && inv.status !== 'REFUNDED') return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const numMatch = String(inv.invoice_number_local).includes(q);
      const custMatch = inv.customer?.full_name.toLowerCase().includes(q) || false;
      const phoneMatch = inv.customer?.phone_number?.includes(q) || false;
      return numMatch || custMatch || phoneMatch;
    }
    return true;
  });

  // Handle Confirm Refund
  const handleConfirmRefund = async () => {
    if (!refundTargetInvoice) return;

    const finalReason =
      selectedReason === 'أخرى (سبب مخصص)' ? customReason.trim() : selectedReason;

    if (!finalReason) {
      showToast('يرجى تحديد أو كتابة سبب المرتجع', 'warning');
      return;
    }

    setIsRefunding(true);
    try {
      await NativeBridge.refundInvoice(
        refundTargetInvoice.local_id,
        finalReason,
        cashierUserId,
      );

      showToast(
        `تم تسجيل الفاتورة #${refundTargetInvoice.invoice_number_local} كمرتجع واسترداد مبلغ ${refundTargetInvoice.total.toFixed(2)} ج.م بنجاح`,
        'success',
      );
      setRefundTargetInvoice(null);
      await loadPaidInvoices();
    } catch (err: any) {
      console.error('Refund error:', err);
      showToast(err.message || 'فشل إتمام عملية المرتجع', 'warning');
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-neutral-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-lg bg-neutral-900 border-r border-neutral-800 h-full flex flex-col shadow-2xl animate-slide-left">
        {/* Header */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100">فواتير ومرتجعات ورديتي</h3>
              <p className="text-[11px] text-neutral-400">
                إدارة الفواتير المسددة وعمل المرتجعات للوردية الحالية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {/* Summary Overview Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-neutral-950/90 border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-400 block mb-0.5 font-bold">صافي المبيعات</span>
              <span className="text-sm font-mono font-black text-emerald-400">
                {netSalesAmount.toFixed(0)} <span className="text-[9px]">ج.م</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950/90 border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-400 block mb-0.5 font-bold">فواتير مسددة</span>
              <span className="text-sm font-mono font-black text-neutral-200">
                {paidInvoices.length} <span className="text-[9px]">فاتورة</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950/90 border border-rose-900/40 text-center bg-rose-950/20">
              <span className="text-[10px] text-rose-300 block mb-0.5 font-bold">المرتجعات</span>
              <span className="text-sm font-mono font-black text-rose-400">
                {refundedInvoices.length} ({totalRefundedAmount.toFixed(0)} <span className="text-[9px]">ج.م</span>)
              </span>
            </div>
          </div>

          {/* Filter Tabs & Search */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterTab('ALL')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterTab === 'ALL'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                الكل ({invoices.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('PAID')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterTab === 'PAID'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                المدفوعة ({paidInvoices.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('REFUNDED')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterTab === 'REFUNDED'
                    ? 'bg-rose-600 text-white font-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                المرتجعات ({refundedInvoices.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم الفاتورة أو اسم العميل..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pr-9 pl-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Invoices List */}
          {isLoading ? (
            <div className="p-8 text-center text-neutral-500 flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
              <span className="text-xs">جاري تحميل الفواتير...</span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-8 bg-neutral-950/40 rounded-xl border border-neutral-800/60 text-center text-neutral-500">
              <Receipt className="w-8 h-8 mx-auto mb-2 text-neutral-600 opacity-60" />
              <p className="text-xs font-medium">لا توجد فواتير مطابقة للبحث أو الفلتر المختار.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredInvoices.map((inv) => {
                const isRefunded = inv.status === 'REFUNDED';

                return (
                  <div
                    key={inv.local_id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                      isRefunded
                        ? 'bg-rose-950/15 border-rose-900/40'
                        : 'bg-neutral-950/90 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {/* Invoice Top Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-neutral-200 bg-neutral-900 px-2 py-0.5 rounded-md border border-neutral-800">
                          #{inv.invoice_number_local}
                        </span>
                        <span className="text-xs font-bold text-neutral-200">
                          {inv.customer ? inv.customer.full_name : 'عميل نقدي'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isRefunded ? (
                          <span className="text-[10px] bg-rose-600/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" />
                            <span>مرتجع مسترد</span>
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">
                            مسددة
                          </span>
                        )}

                        <span
                          className={`text-xs font-mono font-black ${
                            isRefunded ? 'text-rose-400 line-through' : 'text-emerald-400'
                          }`}
                        >
                          {inv.total.toFixed(2)} ج.م
                        </span>
                      </div>
                    </div>

                    {/* Invoice Items & Timing */}
                    <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-1 border-t border-neutral-800/60">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                        <span>
                          {inv.paid_at
                            ? new Date(inv.paid_at).toLocaleTimeString('ar-EG', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                        <span className="text-neutral-600 mx-1">•</span>
                        <span>{inv.lines.length} عناصر</span>
                        {inv.tip_amount && inv.tip_amount > 0 ? (
                          <span className="text-amber-400 mr-1 font-bold">
                            (+{inv.tip_amount} تبس)
                          </span>
                        ) : null}
                      </div>

                      {/* Refund Note if refunded */}
                      {isRefunded && inv.refund_reason && (
                        <span className="text-[10px] text-rose-300 italic truncate max-w-[160px]">
                          السبب: {inv.refund_reason}
                        </span>
                      )}
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center gap-2 pt-1 border-t border-neutral-800/40">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectInvoiceForReprint(inv);
                          onClose();
                        }}
                        className="flex-1 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold border border-neutral-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>معاينة وطباعة</span>
                      </button>

                      {!isRefunded && (
                        <button
                          type="button"
                          onClick={() => {
                            setRefundTargetInvoice(inv);
                            setSelectedReason(REFUND_REASONS[0]);
                            setCustomReason('');
                          }}
                          className="flex-1 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 hover:text-rose-100 rounded-xl text-xs font-bold border border-rose-900/50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                          <span>عمل مرتجع / استرداد</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer Note */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-[10px] text-neutral-500 text-center">
          المرتجعات المسجلة يتم خصمها ومطابقتها تلقائياً في حسابات إغلاق الوردية.
        </div>
      </div>

      {/* --- Refund Confirmation Modal --- */}
      {refundTargetInvoice && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">تأكيد مرتجع واسترداد فاتورة</h3>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    فاتورة #{refundTargetInvoice.invoice_number_local}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefundTargetInvoice(null)}
                className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Invoice Summary Card */}
              <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
                <div className="flex justify-between items-center text-neutral-300">
                  <span>العميل:</span>
                  <span className="font-bold text-white">
                    {refundTargetInvoice.customer?.full_name || 'عميل نقدي'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-300">
                  <span>عدد العناصر والخدمات:</span>
                  <span className="font-bold text-white">{refundTargetInvoice.lines.length} عناصر</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-neutral-800 text-sm font-bold">
                  <span className="text-rose-300">المبلغ المسترد للعميل:</span>
                  <span className="font-mono text-base text-rose-400 font-black">
                    {refundTargetInvoice.total.toFixed(2)} ج.م
                  </span>
                </div>
              </div>

              {/* Refund Reason Selection */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  سبب المرتجع / الاسترداد <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                >
                  {REFUND_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Reason Textarea (if "أخرى" selected) */}
              {selectedReason === 'أخرى (سبب مخصص)' && (
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    اكتب سبب المرتجع بالتفصيل:
                  </label>
                  <textarea
                    rows={2}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="اكتب سبب الاسترداد..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                </div>
              )}

              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-amber-300 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  سيتم تحويل حالة الفاتورة إلى "مرتجع" وتعديل مبيعات الوردية والكاش تلقائياً.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setRefundTargetInvoice(null)}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={isRefunding}
                className="flex-2 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer"
              >
                {isRefunding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                <span>تأكيد المرتجع واسترداد {refundTargetInvoice.total.toFixed(0)} ج.م</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
