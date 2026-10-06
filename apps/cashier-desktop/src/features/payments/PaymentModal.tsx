import React, { useState, useEffect } from 'react';
import { LocalInvoice, LocalPaymentInput, PaymentMethod } from '../../types/sales';
import { LocalEmployee } from '../../types/employee';
import { NativeBridge } from '../../services/nativeBridge';
import {
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Wallet,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Coins,
  HeartHandshake,
  UserCheck,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: LocalInvoice | null;
  activeShiftLocalId: string | null;
  cashierId: string;
  employees?: LocalEmployee[];
  onPaymentSuccess: (paidInvoice: LocalInvoice) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

interface PaymentLineState {
  id: string;
  method: PaymentMethod;
  amount: number | string;
  cashReceived: number | string;
  change: number;
  referenceNote: string;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'CASH', label: 'كاش (نقدي)', icon: Banknote },
  { id: 'CARD', label: 'فيزا / بطاقة', icon: CreditCard },
  { id: 'INSTAPAY', label: 'إنستاباي InstaPay', icon: Smartphone },
  { id: 'WALLET', label: 'فودافون كاش / محفظة', icon: Wallet },
];

const QUICK_TIPS = [0, 10, 20, 30, 50, 100];

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  activeShiftLocalId,
  cashierId,
  employees = [],
  onPaymentSuccess,
  showToast,
}) => {
  const [paymentLines, setPaymentLines] = useState<PaymentLineState[]>([]);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize payment lines and auto-detect barber from invoice lines
  useEffect(() => {
    if (isOpen && invoice) {
      setPaymentLines([
        {
          id: '1',
          method: 'CASH',
          amount: invoice.total,
          cashReceived: invoice.total,
          change: 0,
          referenceNote: '',
        },
      ]);
      setTipAmount(0);
      setErrorMessage(null);

      // Auto-detect barber from first assigned service line
      const assignedLine = invoice.lines.find((l) => l.assigned_employee_id);
      if (assignedLine && assignedLine.assigned_employee_id) {
        setSelectedBarberId(assignedLine.assigned_employee_id);
      } else if (employees.length > 0) {
        setSelectedBarberId(employees[0].id);
      } else {
        setSelectedBarberId('');
      }
    }
  }, [isOpen, invoice, employees]);

  if (!isOpen || !invoice) return null;

  const totalPaid = paymentLines.reduce((sum, line) => {
    const val = typeof line.amount === 'number' ? line.amount : parseFloat(line.amount) || 0;
    return sum + val;
  }, 0);

  const remaining = Math.round((invoice.total - totalPaid) * 100) / 100;
  const isExactMatch = Math.abs(remaining) < 0.001;

  // Selected Barber object
  const assignedBarberFromLine = invoice.lines.find((l) => l.assigned_employee_id);
  const selectedBarber =
    employees.find((e) => e.id === selectedBarberId) ||
    (assignedBarberFromLine
      ? {
          id: assignedBarberFromLine.assigned_employee_id!,
          name: assignedBarberFromLine.assigned_employee_name_snapshot || 'الحلاق',
          role: 'BARBER',
          phone: '',
          is_active: true,
          created_at: '',
        }
      : null);

  // Add an additional payment method (Split payment)
  const handleAddLine = () => {
    if (paymentLines.length === 1) {
      // Intelligently split 50/50 on first split
      const half = Math.round((invoice.total / 2) * 100) / 100;
      const otherHalf = Math.round((invoice.total - half) * 100) / 100;

      const firstLine = {
        ...paymentLines[0],
        amount: half,
        cashReceived: half,
        change: 0,
      };

      const secondLine: PaymentLineState = {
        id: Date.now().toString(),
        method: 'CARD',
        amount: otherHalf,
        cashReceived: otherHalf,
        change: 0,
        referenceNote: '',
      };

      setPaymentLines([firstLine, secondLine]);
    } else {
      const nextAmount = remaining > 0 ? remaining : 0;
      const newLine: PaymentLineState = {
        id: Date.now().toString(),
        method: 'CARD',
        amount: nextAmount,
        cashReceived: nextAmount,
        change: 0,
        referenceNote: '',
      };
      setPaymentLines([...paymentLines, newLine]);
    }
  };

  const handleRemoveLine = (id: string) => {
    if (paymentLines.length <= 1) return;
    const remainingLines = paymentLines.filter((l) => l.id !== id);
    if (remainingLines.length === 1) {
      // Reset single line back to full invoice total
      setPaymentLines([
        {
          ...remainingLines[0],
          amount: invoice.total,
          cashReceived: invoice.total,
          change: 0,
        },
      ]);
    } else {
      setPaymentLines(remainingLines);
    }
  };

  const handleLineMethodChange = (id: string, method: PaymentMethod) => {
    setPaymentLines(
      paymentLines.map((line) => {
        if (line.id === id) {
          const numAmt = typeof line.amount === 'number' ? line.amount : parseFloat(line.amount) || 0;
          const cashReceived = method === 'CASH' ? numAmt + tipAmount : 0;
          return {
            ...line,
            method,
            cashReceived,
            change: 0,
          };
        }
        return line;
      }),
    );
  };

  const handleLineAmountChange = (id: string, rawVal: string) => {
    const numVal = parseFloat(rawVal) || 0;

    setPaymentLines((prevLines) => {
      // If there are exactly 2 lines and we are editing one of them, auto-balance the other line
      if (prevLines.length === 2) {
        const otherLineIndex = prevLines.findIndex((l) => l.id !== id);
        const thisLineIndex = prevLines.findIndex((l) => l.id === id);
        if (otherLineIndex !== -1 && thisLineIndex !== -1) {
          const balancedOtherAmount = Math.max(0, Math.round((invoice.total - numVal) * 100) / 100);
          
          return prevLines.map((line, idx) => {
            if (idx === thisLineIndex) {
              return {
                ...line,
                amount: rawVal,
                cashReceived: line.method === 'CASH' ? (rawVal === '' ? '' : numVal) : line.cashReceived,
                change: 0,
              };
            } else {
              return {
                ...line,
                amount: balancedOtherAmount,
                cashReceived: line.method === 'CASH' ? balancedOtherAmount : line.cashReceived,
                change: 0,
              };
            }
          });
        }
      }

      // Default update for single or multi > 2 lines
      return prevLines.map((line) => {
        if (line.id === id) {
          return {
            ...line,
            amount: rawVal,
            cashReceived: line.method === 'CASH' ? (rawVal === '' ? '' : numVal) : line.cashReceived,
            change: 0,
          };
        }
        return line;
      });
    });
  };

  const handleCashReceivedChange = (id: string, rawVal: string) => {
    const numReceived = parseFloat(rawVal) || 0;
    setPaymentLines(
      paymentLines.map((line) => {
        if (line.id === id) {
          const lineAmt = typeof line.amount === 'number' ? line.amount : parseFloat(line.amount) || 0;
          const effectiveNeeded = lineAmt + tipAmount;
          const change = Math.max(0, numReceived - effectiveNeeded);
          return {
            ...line,
            cashReceived: rawVal,
            change,
          };
        }
        return line;
      }),
    );
  };

  const handleApplyExcessAsTip = (lineId: string) => {
    const line = paymentLines.find((l) => l.id === lineId);
    if (!line) return;
    const numReceived = typeof line.cashReceived === 'number' ? line.cashReceived : parseFloat(line.cashReceived) || 0;
    const numAmt = typeof line.amount === 'number' ? line.amount : parseFloat(line.amount) || 0;
    const excess = Math.max(0, numReceived - numAmt);
    if (excess > 0) {
      setTipAmount(excess);
      setPaymentLines(
        paymentLines.map((l) => (l.id === lineId ? { ...l, change: 0 } : l)),
      );
    }
  };

  const handleReferenceChange = (id: string, referenceNote: string) => {
    setPaymentLines(
      paymentLines.map((line) => (line.id === id ? { ...line, referenceNote } : line)),
    );
  };

  const handleSubmitPayment = async () => {
    setErrorMessage(null);

    if (!activeShiftLocalId) {
      setErrorMessage('لا توجد وردية مفتوحة. يجب فتح وردية قبل إتمام الدفع.');
      return;
    }

    if (!isExactMatch) {
      if (remaining > 0) {
        setErrorMessage(`المبلغ المدفوع غير مكتمل. يتبقى ${remaining.toFixed(2)} ج.م.`);
      } else {
        setErrorMessage(`إجمالي المدفوعات (${totalPaid.toFixed(2)} ج.م) يتجاوز إجمالي الفاتورة (${invoice.total.toFixed(2)} ج.م).`);
      }
      return;
    }

    // Validate each line
    for (const line of paymentLines) {
      const lineAmt = typeof line.amount === 'number' ? line.amount : parseFloat(line.amount) || 0;
      const numReceived = typeof line.cashReceived === 'number' ? line.cashReceived : parseFloat(line.cashReceived) || 0;

      if (lineAmt <= 0) {
        setErrorMessage('يجب أن تكون مبالغ طرق الدفع أكبر من الصفر.');
        return;
      }
      if (line.method === 'CASH' && numReceived < lineAmt) {
        setErrorMessage('المبلغ المستلم نقداً لا يمكن أن يكون أقل من المبلغ المطلوب سداده كاش.');
        return;
      }
    }

    setIsProcessing(true);
    try {
      const paymentsPayload: LocalPaymentInput[] = paymentLines.map((line) => {
        const lineAmt = typeof line.amount === 'number' ? line.amount : parseFloat(line.amount) || 0;
        const numReceived = typeof line.cashReceived === 'number' ? line.cashReceived : parseFloat(line.cashReceived) || 0;

        return {
          payment_method: line.method,
          amount: lineAmt,
          cash_received_amount: line.method === 'CASH' ? numReceived : undefined,
          change_amount: line.method === 'CASH' ? line.change : undefined,
          reference_note: line.referenceNote.trim() || undefined,
        };
      });

      const tipDetails =
        tipAmount > 0
          ? {
              tip_amount: tipAmount,
              tip_recipient_employee_id: selectedBarber?.id || undefined,
              tip_recipient_employee_name_snapshot: selectedBarber?.name || undefined,
            }
          : undefined;

      const paidInvoice = await NativeBridge.processInvoicePayment(
        invoice.local_id,
        activeShiftLocalId,
        paymentsPayload,
        cashierId,
        tipDetails,
      );

      showToast(`تم إتمام دفع الفاتورة #${invoice.invoice_number_local} بنجاح`, 'success');
      onPaymentSuccess(paidInvoice);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل إتمام عملية الدفع');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4 select-none">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">إتمام دفع وتحصيل الفاتورة</h3>
                <span className="text-xs font-mono font-black bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  #{invoice.invoice_number_local}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {invoice.customer ? `العميل: ${invoice.customer.full_name}` : 'عميل بدون بيانات (نقدي)'} •{' '}
                {invoice.lines.length} عناصر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {/* Total Overview Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center shadow-inner">
              <span className="text-xs text-slate-400 block mb-1 font-bold">قيمة الفاتورة</span>
              <span className="text-lg font-mono font-black text-amber-400">
                {invoice.total.toFixed(2)} <span className="text-xs font-normal">ج.م</span>
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center shadow-inner">
              <span className="text-xs text-slate-400 block mb-1 font-bold">المسدد للفاتورة</span>
              <span className="text-lg font-mono font-black text-emerald-400">
                {totalPaid.toFixed(2)} <span className="text-xs font-normal">ج.م</span>
              </span>
            </div>

            <div
              className={`p-3 bg-slate-950 rounded-2xl border text-center shadow-inner ${
                isExactMatch
                  ? 'border-emerald-700/60 text-emerald-300'
                  : remaining > 0
                  ? 'border-amber-700/60 text-amber-300'
                  : 'border-rose-700/60 text-rose-300'
              }`}
            >
              <span className="text-xs text-slate-400 block mb-1 font-bold">المتبقي</span>
              <span className="text-lg font-mono font-black">
                {remaining.toFixed(2)} <span className="text-xs font-normal">ج.م</span>
              </span>
            </div>
          </div>

          {/* Validation Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-center gap-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Tips / الإكراميات Section */}
          <div className="p-4 bg-gradient-to-br from-amber-950/30 to-slate-950 rounded-2xl border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-amber-300">إكرامية / تبس للحلاق (Tips)</span>
              </div>
              {tipAmount > 0 && (
                <span className="text-xs font-black font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                  +{tipAmount.toFixed(2)} ج.م
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Barber Attribution */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  الحلاق المستحق للتبس:
                </label>
                <div className="relative">
                  <select
                    value={selectedBarberId}
                    onChange={(e) => setSelectedBarberId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                  >
                    <option value="">-- بدون حلاق محدد --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}{' '}
                        {assignedBarberFromLine?.assigned_employee_id === emp.id
                          ? '(الحلاق المنفذ للخدمة ⭐)'
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tip Amount Custom Input & Quick Buttons */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  مبلغ التبس (ج.م):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={tipAmount || ''}
                    onChange={(e) => setTipAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono font-black text-amber-300 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <div className="flex gap-1">
                    {QUICK_TIPS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTipAmount(amt)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-black transition-all cursor-pointer ${
                          tipAmount === amt
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {amt === 0 ? 'بدون' : amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-300">طرق الدفع والتوزيع</span>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs font-black text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ طريقة دفع إضافية (دفع مختلط)</span>
              </button>
            </div>

            {paymentLines.map((line) => {
              const lineAmt = typeof line.amount === 'number' ? line.amount : parseFloat(line.amount) || 0;
              const numReceived = typeof line.cashReceived === 'number' ? line.cashReceived : parseFloat(line.cashReceived) || 0;
              const excess = line.method === 'CASH' ? numReceived - lineAmt : 0;

              return (
                <div
                  key={line.id}
                  className="p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-3 shadow-md"
                >
                  {/* Line Header: Method Selector & Remove */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-1">
                      {PAYMENT_METHODS.map((m) => {
                        const Icon = m.icon;
                        const isSelected = line.method === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleLineMethodChange(line.id, m.id)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span className="truncate">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {paymentLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(line.id)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                        title="حذف طريقة الدفع"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Line Amount & Specifics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-900">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        المبلغ المسدد للفاتورة (ج.م)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={line.amount}
                        onChange={(e) => handleLineAmountChange(line.id, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm font-mono font-black text-white focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    {line.method === 'CASH' ? (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">
                            المبلغ المستلم نقداً من العميل (ج.م)
                          </label>
                          <input
                            type="number"
                            step="1"
                            value={line.cashReceived}
                            onChange={(e) => handleCashReceivedChange(line.id, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm font-mono font-black text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                        </div>

                        {/* Quick One-Click Button ONLY if invoice is fully balanced and client genuinely paid extra cash */}
                        {isExactMatch && excess > 0 && tipAmount === 0 && (
                          <button
                            type="button"
                            onClick={() => handleApplyExcessAsTip(line.id)}
                            className="w-full py-1.5 px-2 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>تسجيل الفارق الزائد ({excess.toFixed(2)} ج.م) كإكرامية للحلاق</span>
                          </button>
                        )}

                        {line.change > 0 && (
                          <div className="p-2 bg-emerald-950/50 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-emerald-300 font-bold">الباقي للعميل:</span>
                            <span className="font-mono font-black text-emerald-400 text-sm">
                              {line.change.toFixed(2)} ج.م
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">
                          رقم المرجع / العملية (اختياري)
                        </label>
                        <input
                          type="text"
                          placeholder="مثال: Ref #9482 أو محفظة 010xxx"
                          value={line.referenceNote}
                          onChange={(e) => handleReferenceChange(line.id, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSubmitPayment}
            disabled={isProcessing || !isExactMatch || !activeShiftLocalId}
            className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-black rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-xl active:scale-98 cursor-pointer"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            <span>
              تأكيد واستلام الدفع (
              {(invoice.total + (tipAmount || 0)).toFixed(2)} ج.م)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
