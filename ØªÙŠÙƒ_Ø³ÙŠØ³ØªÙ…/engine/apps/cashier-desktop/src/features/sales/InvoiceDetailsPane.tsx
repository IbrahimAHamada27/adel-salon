import React, { useState } from 'react';
import { LocalInvoice, LocalInvoiceLine } from '../../types/sales';
import {
  User,
  UserPlus,
  Scissors,
  Plus,
  Minus,
  FileText,
  PauseCircle,
  XCircle,
  Lock,
  ShoppingBag,
  CreditCard,
  AlertCircle,
  Receipt,
  UserCheck,
  CheckCircle2,
  MoreVertical,
  Trash2,
} from 'lucide-react';

interface InvoiceDetailsPaneProps {
  invoice: LocalInvoice | null;
  isOpenShift: boolean;
  onOpenCustomerModal: () => void;
  onOpenAdjustmentDrawer: (line: LocalInvoiceLine) => void;
  onOpenBarberModal: (line: LocalInvoiceLine) => void;
  onUpdateQuantity: (lineId: string, qty: number) => void;
  onRemoveLine: (lineId: string) => void;
  onUpdateNote: (note: string) => void;
  onSuspendInvoice: () => void;
  onCancelInvoice: () => void;
  onOpenPaymentModal: () => void;
  onOpenShiftModal?: () => void;
}

export const InvoiceDetailsPane: React.FC<InvoiceDetailsPaneProps> = ({
  invoice,
  isOpenShift,
  onOpenCustomerModal,
  onOpenAdjustmentDrawer,
  onOpenBarberModal,
  onUpdateQuantity,
  onRemoveLine,
  onUpdateNote,
  onSuspendInvoice,
  onCancelInvoice,
  onOpenPaymentModal,
  onOpenShiftModal,
}) => {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(invoice?.internal_note || '');
  const [activeMenuLineId, setActiveMenuLineId] = useState<string | null>(null);

  React.useEffect(() => {
    setNoteText(invoice?.internal_note || '');
  }, [invoice?.local_id, invoice?.internal_note]);

  if (!invoice) {
    return (
      <div className="h-full bg-slate-900 border-r border-slate-800 flex flex-col items-center justify-center p-8 text-center text-slate-500 select-none">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3 shadow-lg">
          <Receipt className="w-8 h-8 text-amber-400/70" />
        </div>
        <h3 className="text-base font-bold text-slate-200">لا توجد فاتورة نشطة</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
          اختر فاتورة من الشريط السفلي أو اضغط على أي خدمة أو منتج لبدء فاتورة جديدة.
        </p>
      </div>
    );
  }

  const isPaid = invoice.status === 'PAID';
  const canPay = isOpenShift && invoice.lines.length > 0 && !isPaid;

  const handleSaveNote = () => {
    if (isPaid) return;
    onUpdateNote(noteText.trim());
    setIsEditingNote(false);
  };

  return (
    <div className="h-full bg-slate-900 border-r border-slate-800 flex flex-col select-none overflow-hidden shadow-2xl">
      {/* 1. Customer Information Block (Single unified row) */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">العميل:</span>
              {invoice.customer ? (
                <span className="font-bold text-white truncate">{invoice.customer.full_name}</span>
              ) : (
                <span className="text-slate-300 font-medium">بدون بيانات (نقدي)</span>
              )}
            </div>
            {invoice.customer?.phone_number && (
              <div className="text-[11px] text-amber-400 font-mono" dir="ltr">
                {invoice.customer.phone_number}
              </div>
            )}
          </div>
        </div>

        {!isPaid ? (
          <button
            onClick={onOpenCustomerModal}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            {invoice.customer ? (
              <>
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>تغيير</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>اختيار / إضافة</span>
              </>
            )}
          </button>
        ) : (
          <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>مدفوعة</span>
          </span>
        )}
      </div>

      {/* 2. Line Items List (Scrollable cart body) */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin">
        {invoice.lines.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <ShoppingBag className="w-10 h-10 mb-2 opacity-30 text-slate-400" />
            <p className="text-xs font-bold text-slate-300">السلة فارغة</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
              اختر الخدمات أو المنتجات من القائمة المقابلة لإضافتها للفاتورة.
            </p>
          </div>
        ) : (
          invoice.lines.map((line) => {
            const isService = line.item_type === 'SERVICE';
            const hasAdjustment = !!line.active_adjustment;
            const isMenuOpen = activeMenuLineId === line.local_id;

            return (
              <div
                key={line.local_id}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700/90 flex flex-col gap-2 transition-all shadow-sm relative"
              >
                {/* Row 1: Line Name, Unit Price & Context Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isService
                          ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/60'
                          : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                      }`}
                    >
                      {isService ? <Scissors className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate leading-snug">
                        {line.item_name_snapshot}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {line.original_unit_price_snapshot.toFixed(2)} ج.م
                      </div>
                    </div>
                  </div>

                  {/* Top Right: Line Action Menu / Delete */}
                  {!isPaid && (
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setActiveMenuLineId(isMenuOpen ? null : line.local_id)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                        title="خيارات السطر"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute left-0 mt-1 w-32 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1 z-30 animate-in fade-in-50">
                          <button
                            onClick={() => {
                              setActiveMenuLineId(null);
                              onOpenAdjustmentDrawer(line);
                            }}
                            className="w-full text-right px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer"
                          >
                            تعديل السعر
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuLineId(null);
                              onRemoveLine(line.local_id);
                            }}
                            className="w-full text-right px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-950/40 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            <span>حذف من السلة</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Row 2: Fixed Barber Assignment Row (Strictly for services) */}
                {isService && (
                  <div className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <span className="text-slate-400 font-medium">الحلاق:</span>
                      <span className={`font-semibold ${line.assigned_employee_name_snapshot ? 'text-amber-300' : 'text-slate-400 italic'}`}>
                        {line.assigned_employee_name_snapshot || 'غير محدد'}
                      </span>
                    </div>

                    {!isPaid && (
                      <button
                        onClick={() => onOpenBarberModal(line)}
                        className="text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-slate-800 hover:bg-slate-750 px-2 py-0.5 rounded border border-slate-700 transition-colors cursor-pointer"
                      >
                        {line.assigned_employee_name_snapshot ? 'تغيير' : 'اختيار'}
                      </button>
                    )}
                  </div>
                )}

                {/* Row 3: Product Quantity Stepper & Price Adjustment & Line Total */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                  {/* Quantity controls: Only for Products */}
                  {!isService ? (
                    !isPaid ? (
                      <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                        <button
                          onClick={() => onUpdateQuantity(line.local_id, line.quantity - 1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                          title="تقليل الكمية"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-mono font-bold text-xs text-white">
                          {line.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(line.local_id, line.quantity + 1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                          title="زيادة الكمية"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        الكمية: {line.quantity}
                      </span>
                    )
                  ) : (
                    <div />
                  )}

                  {/* Price adjustment button & Final line price */}
                  <div className="flex items-center gap-2">
                    {!isPaid && (
                      <button
                        onClick={() => onOpenAdjustmentDrawer(line)}
                        className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer font-medium ${
                          hasAdjustment
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {hasAdjustment ? 'معدل' : 'تعديل السعر'}
                      </button>
                    )}

                    <div className="text-left font-mono">
                      {hasAdjustment && (
                        <span className="text-[10px] text-slate-500 line-through block text-left">
                          {(line.original_unit_price_snapshot * line.quantity).toFixed(2)}
                        </span>
                      )}
                      <span className="font-bold text-xs text-amber-400">
                        {line.line_final_total.toFixed(2)} <span className="text-[10px] font-sans text-slate-400">ج.م</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Internal Note Section (Discreet) */}
      <div className="p-2 bg-slate-950 border-t border-slate-800 shrink-0">
        {!isEditingNote ? (
          <div
            onClick={() => !isPaid && setIsEditingNote(true)}
            className={`p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs transition-colors ${
              !isPaid ? 'cursor-pointer hover:border-slate-700' : ''
            }`}
          >
            <div className="flex items-center gap-1.5 text-slate-400 truncate">
              <FileText className="w-3.5 h-3.5 shrink-0 text-slate-500" />
              <span className="truncate text-[11px] text-slate-300">
                {invoice.internal_note || 'ملاحظة داخلية...'}
              </span>
            </div>
            {!isPaid && <span className="text-[11px] text-amber-400 font-medium hover:underline">تعديل</span>}
          </div>
        ) : (
          <div className="space-y-1.5">
            <textarea
              rows={2}
              autoFocus
              placeholder="اكتب ملاحظة داخلية (لا تظهر للعميل)..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <div className="flex gap-1.5 justify-end">
              <button
                onClick={handleSaveNote}
                className="px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-xs font-bold cursor-pointer"
              >
                حفظ
              </button>
              <button
                onClick={() => {
                  setNoteText(invoice.internal_note || '');
                  setIsEditingNote(false);
                }}
                className="px-2.5 py-0.5 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700 cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Financial Summary & Grand Total (Clean contrast) */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-1.5 text-xs shrink-0">
        <div className="flex justify-between items-center text-slate-400">
          <span className="font-medium">المجموع الفرعي:</span>
          <span className="font-mono font-semibold text-slate-200">{invoice.subtotal.toFixed(2)} ج.م</span>
        </div>

        {invoice.total_discount > 0 && (
          <div className="flex justify-between items-center text-emerald-400 font-medium">
            <span>الخصم:</span>
            <span className="font-mono font-bold">-{invoice.total_discount.toFixed(2)} ج.م</span>
          </div>
        )}

        {invoice.total_surcharge > 0 && (
          <div className="flex justify-between items-center text-amber-400 font-medium">
            <span>الزيادة:</span>
            <span className="font-mono font-bold">+{invoice.total_surcharge.toFixed(2)} ج.م</span>
          </div>
        )}

        {/* Grand Total Row */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 mt-1">
          <span className="text-xs font-bold text-white">الإجمالي النهائي:</span>
          <div className="text-xl font-black font-mono text-amber-400">
            {invoice.total.toFixed(2)} <span className="text-xs font-sans text-slate-400 font-normal">ج.م</span>
          </div>
        </div>
      </div>

      {/* 5. Fixed Actions: Primary Pay Button & Discreet Secondary Danger/Hold */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2 shrink-0">
        {!isPaid ? (
          <>
            {/* Primary Payment Action: Full Width Green Button */}
            {!isOpenShift ? (
              <button
                onClick={() => onOpenShiftModal && onOpenShiftModal()}
                className="w-full py-3 font-bold rounded-xl text-xs flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>فتح وردية جديدة للبدء</span>
              </button>
            ) : (
              <button
                onClick={onOpenPaymentModal}
                disabled={!canPay}
                className={`w-full py-3.5 font-black rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer ${
                  canPay
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                    : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                }`}
              >
                {invoice.lines.length === 0 ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-slate-500" />
                    <span>أضف خدمات أو منتجات للدفع</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-white" />
                    <span>إتمام الدفع ({invoice.total.toFixed(2)} ج.م)</span>
                  </>
                )}
              </button>
            )}

            {/* Secondary Actions: Suspend & Cancel Invoice (Discreet) */}
            <div className="flex gap-2 pt-0.5">
              <button
                onClick={onSuspendInvoice}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-medium border border-slate-800 transition-colors cursor-pointer"
              >
                <PauseCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>تعليق الفاتورة</span>
              </button>

              <button
                onClick={onCancelInvoice}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-900 hover:bg-rose-950/30 text-slate-400 hover:text-rose-300 rounded-lg text-xs font-medium border border-slate-800 hover:border-rose-900/40 transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400/80" />
                <span>إلغاء الفاتورة</span>
              </button>
            </div>
          </>
        ) : (
          <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-center text-xs text-emerald-300 font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>تم سداد هذه الفاتورة بالكامل</span>
          </div>
        )}
      </div>
    </div>
  );
};
