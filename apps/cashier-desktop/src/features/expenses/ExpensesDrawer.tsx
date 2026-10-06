import React, { useState, useEffect, useCallback } from 'react';
import { LocalExpense } from '../../types/expense';
import { NativeBridge } from '../../services/nativeBridge';
import {
  X,
  Plus,
  Coins,
  Receipt,
  FileText,
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface ExpensesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeShiftLocalId: string | null;
  cashierId: string;
  onExpenseAdded: () => void;
  showToast: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

export const ExpensesDrawer: React.FC<ExpensesDrawerProps> = ({
  isOpen,
  onClose,
  activeShiftLocalId,
  cashierId,
  onExpenseAdded,
  showToast,
}) => {
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    if (!activeShiftLocalId) return;
    setIsLoading(true);
    try {
      const data = await NativeBridge.getActiveShiftExpenses(activeShiftLocalId);
      setExpenses(data);
    } catch (err: any) {
      console.error('Failed to load expenses:', err);
      showToast(err.message || 'فشل تحميل مصروفات الوردية', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [activeShiftLocalId, showToast]);

  useEffect(() => {
    if (isOpen && activeShiftLocalId) {
      loadExpenses();
      setAmountStr('');
      setCategory('');
      setInternalNote('');
      setErrorMsg(null);
    }
  }, [isOpen, activeShiftLocalId, loadExpenses]);

  if (!isOpen) return null;

  const totalShiftExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!activeShiftLocalId) {
      setErrorMsg('لا توجد وردية مفتوحة حالياً لتسجيل المصروف.');
      return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('يرجى إدخال مبلغ صحيح أكبر من الصفر.');
      return;
    }

    const trimmedCategory = category.trim();
    if (!trimmedCategory) {
      setErrorMsg('يرجى إدخال تصنيف المصروف.');
      return;
    }

    setIsSubmitting(true);
    try {
      await NativeBridge.recordExpense(
        activeShiftLocalId,
        amount,
        trimmedCategory,
        internalNote.trim() || undefined,
        cashierId,
      );

      showToast(`تم تسجيل مصروف بمبلغ ${amount.toFixed(2)} ج.م بنجاح`, 'success');
      setAmountStr('');
      setCategory('');
      setInternalNote('');
      await loadExpenses();
      onExpenseAdded();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تسجيل المصروف');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-neutral-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-md bg-neutral-900 border-r border-neutral-800 h-full flex flex-col shadow-2xl animate-slide-left">
        {/* Header */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100">مصروفات الوردية الحالية</h3>
              <p className="text-[11px] text-neutral-400">تخصم مباشرة من الكاش المتوقع في الخزينة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Total Summary Card */}
          <div className="p-4 rounded-xl bg-neutral-950/90 border border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-semibold text-neutral-300">إجمالي مصروفات الوردية:</span>
            </div>
            <span className="text-lg font-mono font-bold text-amber-400">
              {totalShiftExpenses.toFixed(2)} ج.م
            </span>
          </div>

          {/* Add Expense Form */}
          <form onSubmit={handleAddExpense} className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-200 border-b border-neutral-800 pb-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>إضافة مصروف جديد للدرج</span>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-red-950/40 border border-red-800/50 rounded-lg flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                المبلغ المنصرف (ج.م) <span className="text-amber-400">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                placeholder="مثال: 50"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 font-mono focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                تصنيف المصروف <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                placeholder="مثال: مستلزمات نظافة، شاي وضيافة، صيانة سريعة..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                ملاحظات أو تفاصيل (اختياري)
              </label>
              <textarea
                rows={2}
                placeholder="تفاصيل إضافية عن سبب الصرف أو الجهة..."
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Receipt Image Placeholder */}
            <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
              <div className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-neutral-500" />
                <span>صورة إيصال الصرف</span>
              </div>
              <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded">
                ميزة مستقبلية
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !activeShiftLocalId}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>تسجيل المصروف في الوردية</span>
            </button>
          </form>

          {/* Shift Expenses List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-300 px-1">
              <span>سجل مصروفات هذه الوردية ({expenses.length})</span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-neutral-500 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                <span className="text-xs">جاري تحميل المصروفات...</span>
              </div>
            ) : expenses.length === 0 ? (
              <div className="p-6 bg-neutral-950/40 rounded-xl border border-neutral-800/60 text-center text-neutral-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-neutral-600 opacity-60" />
                <p className="text-xs font-medium">لم يتم تسجيل أي مصروفات في هذه الوردية حتى الآن.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.map((expense) => (
                  <div
                    key={expense.local_id}
                    className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-200">{expense.category}</span>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        -{expense.amount.toFixed(2)} ج.م
                      </span>
                    </div>

                    {expense.internal_note && (
                      <p className="text-[11px] text-neutral-400 bg-neutral-900/60 p-1.5 rounded">
                        {expense.internal_note}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono pt-1 border-t border-neutral-800/60">
                      <span>كاش الخزينة</span>
                      <span>{new Date(expense.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-[10px] text-neutral-500 text-center">
          المصروفات المسجلة نهائية ومقيدة بالوردية المفتوحة الحالية فقط.
        </div>
      </div>
    </div>
  );
};
