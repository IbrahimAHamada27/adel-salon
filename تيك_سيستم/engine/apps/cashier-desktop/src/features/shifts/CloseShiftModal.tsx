import React, { useState, useEffect } from 'react';
import { LocalShift, ShiftSummary } from '../../types/shift';
import { LocalInvoice } from '../../types/sales';
import { NativeBridge } from '../../services/nativeBridge';
import {
  X,
  StopCircle,
  AlertTriangle,
  DollarSign,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Scissors,
  Coins,
  Download,
  Calendar,
  Clock,
  UserCheck,
} from 'lucide-react';

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeShift: LocalShift;
  openInvoices: LocalInvoice[];
  cashierUserId: string;
  onShiftClosed: () => void;
}

export const CloseShiftModal: React.FC<CloseShiftModalProps> = ({
  isOpen,
  onClose,
  activeShift,
  openInvoices,
  cashierUserId,
  onShiftClosed,
}) => {
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [actualCash, setActualCash] = useState<string>('');
  const [closingNote, setClosingNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeShift) {
      NativeBridge.getShiftSummary(activeShift.local_id)
        .then((s) => {
          setSummary(s);
          setActualCash(s.expected_cash.toString());
        })
        .catch(console.error);
    }
  }, [isOpen, activeShift]);

  if (!isOpen) return null;

  const openDraftsCount = openInvoices.filter(
    (i) => i.status === 'DRAFT' || i.status === 'SUSPENDED',
  ).length;

  const numActual = parseFloat(actualCash) || 0;
  const expectedCash = summary?.expected_cash || 0;
  const cashDiff = Math.round((numActual - expectedCash) * 100) / 100;
  const hasDiscrepancy = Math.abs(cashDiff) > 0.001;

  // Export Shift Report to Excel (.xlsx) using ExcelJS
  const handleExportExcel = async () => {
    if (!summary) return;

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ADEL SALON POS';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('تقرير الوردية', {
      views: [{ rightToLeft: true }],
    });

    // Styling helpers
    const headerFill: any = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    const subHeaderFill: any = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' },
    };
    const whiteFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

    worksheet.columns = [
      { header: 'البيان', key: 'label', width: 35 },
      { header: 'القيمة', key: 'value', width: 25 },
      { header: 'ملاحظات إضافية', key: 'notes', width: 30 },
    ];

    // Main Title
    const titleRow = worksheet.addRow(['تقرير إغلاق الوردية - صالون عادل ADEL SALON', '', '']);
    titleRow.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleRow.fill = headerFill;
    worksheet.mergeCells(`A${titleRow.number}:C${titleRow.number}`);

    worksheet.addRow([]);

    // Shift Info
    worksheet.addRow(['معرف الوردية', activeShift.local_id, '']);
    worksheet.addRow(['الكاشير المسؤول', activeShift.cashier_display_name_snapshot || cashierUserId, '']);
    worksheet.addRow(['تاريخ الوردية', new Date(activeShift.opened_at).toLocaleDateString('ar-EG'), '']);
    worksheet.addRow(['وقت الفتح', new Date(activeShift.opened_at).toLocaleTimeString('ar-EG'), '']);
    worksheet.addRow(['وقت الإغلاق', new Date().toLocaleTimeString('ar-EG'), '']);

    worksheet.addRow([]);

    // Financial Header
    const finHeader = worksheet.addRow(['الملخص المالي للنقدية والمبيعات', 'المبلغ (ج.م)', '']);
    finHeader.font = whiteFont;
    finHeader.fill = subHeaderFill;

    worksheet.addRow(['كاش البداية (العهدة الافتتاحية)', summary.opening_cash, '']);
    worksheet.addRow(['مبيعات الكاش النقدية', summary.cash_sales, '']);
    worksheet.addRow(['مبيعات الدفع الإلكتروني (فيزا / محافظ)', summary.non_cash_sales, '']);
    worksheet.addRow(['إجمالي المبيعات الكاملة', summary.total_sales, '']);
    worksheet.addRow(['إجمالي مصروفات الكاش للوردية', summary.cash_expenses, '']);
    worksheet.addRow(['إجمالي التبس المجمّع للحلاقين', summary.total_tips || 0, '']);
    worksheet.addRow(['الكاش المتوقع في الدرج', summary.expected_cash, '']);
    worksheet.addRow(['الكاش الفعلي المحسوب (العد الفعلي)', numActual, '']);
    worksheet.addRow(['فارق الخزنة (عجز / زيادة)', cashDiff, closingNote.trim() || 'لا توجد ملاحظات']);

    worksheet.addRow([]);

    // Barbers Section
    const barberHeader = worksheet.addRow(['أداء الحلاقين وتوزيع التبس', 'عدد الخدمات', 'إجمالي المبيعات (ج.م)', 'إجمالي التبس (ج.م)']);
    barberHeader.font = whiteFont;
    barberHeader.fill = subHeaderFill;

    if (summary.barbers_performance && summary.barbers_performance.length > 0) {
      summary.barbers_performance.forEach((b) => {
        worksheet.addRow([b.employee_name, b.services_count, b.total_sales, b.total_tips]);
      });
    } else {
      worksheet.addRow(['لا توجد خدمات مسجلة لحلاقين في هذه الوردية', 0, 0, 0]);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `تقرير_وردية_${activeShift.local_id.slice(-8)}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (openDraftsCount > 0) {
      setErrorMessage(
        `لا يمكن إغلاق الوردية قبل تسوية الفواتير المفتوحة (يوجد ${openDraftsCount} فواتير مسودة/معلقة)`,
      );
      return;
    }

    if (isNaN(numActual) || numActual < 0) {
      setErrorMessage('يرجى إدخال مبلغ الكاش الفعلي بشكل صحيح (صفر أو أكثر)');
      return;
    }

    if (hasDiscrepancy && !closingNote.trim()) {
      setErrorMessage('يجب إدخال سبب فرق الخزنة (عجز أو زيادة) لإتمام الإغلاق');
      return;
    }

    setIsSubmitting(true);
    try {
      await NativeBridge.closeShift(
        activeShift.local_id,
        numActual,
        closingNote.trim() || undefined,
        cashierUserId,
      );
      onShiftClosed();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل إغلاق الوردية');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-neutral-950 px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <StopCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100">إغلاق الوردية والمطابقة النقدية</h2>
              <p className="text-xs text-neutral-400">
                مراجعة الأداء المالي، التبس للحلاقين، وتسوية الدرج
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto scrollbar-thin">
          {errorMessage && (
            <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Open Drafts Warning */}
          {openDraftsCount > 0 && (
            <div className="p-3.5 bg-amber-950/40 border border-amber-800/80 rounded-xl text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold block">تنبيه: توجد فواتير مفتوحة/معلقة</span>
                <span className="text-neutral-300 block mt-0.5">
                  يوجد حالياً ({openDraftsCount}) فواتير غير مسددة. يجب إتمام دفعها أو إلغاؤها قبل إتمام إغلاق الوردية.
                </span>
              </div>
            </div>
          )}

          {/* Financial Breakdown Table */}
          {summary && (
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-xs font-bold text-neutral-300 pb-1 border-b border-neutral-800">
                <span>الملخص المالي للوردية</span>
                <span className="font-mono text-neutral-400">#{activeShift.local_id.slice(-8)}</span>
              </div>

              <div className="flex justify-between text-neutral-400">
                <span>كاش البداية (العهدة):</span>
                <span className="font-mono font-bold text-neutral-200">
                  {summary.opening_cash.toFixed(2)} ج.م
                </span>
              </div>

              <div className="flex justify-between text-neutral-400">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>مبيعات الكاش النقدية:</span>
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  +{summary.cash_sales.toFixed(2)} ج.م
                </span>
              </div>

              <div className="flex justify-between text-neutral-400">
                <span className="flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-red-400" />
                  <span>مصروفات الكاش للوردية:</span>
                </span>
                <span className="font-mono font-bold text-red-400">
                  -{summary.cash_expenses.toFixed(2)} ج.م
                </span>
              </div>

              <div className="flex justify-between text-neutral-400">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                  <span>مبيعات إلكترونية (فيزا / إنستاباي / محفظة):</span>
                </span>
                <span className="font-mono text-blue-400">
                  {summary.non_cash_sales.toFixed(2)} ج.م
                </span>
              </div>

              {summary.total_tips > 0 && (
                <div className="flex justify-between text-amber-300 font-bold bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                  <span className="flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>إجمالي التبس المجمّع للحلاقين:</span>
                  </span>
                  <span className="font-mono text-amber-400">
                    +{summary.total_tips.toFixed(2)} ج.م
                  </span>
                </div>
              )}

              <div className="flex justify-between text-neutral-100 font-bold pt-2 border-t border-neutral-800 text-sm">
                <span>الكاش المتوقع في الدرج:</span>
                <span className="font-mono text-amber-400 text-base">
                  {summary.expected_cash.toFixed(2)} ج.م
                </span>
              </div>
            </div>
          )}

          {/* Barbers & Tips Performance Section */}
          {summary && summary.barbers_performance && summary.barbers_performance.length > 0 && (
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-200">
                  <Scissors className="w-3.5 h-3.5 text-amber-400" />
                  <span>مراجعة أداء الحلاقين والتبس للوردية</span>
                </div>
                <span className="text-[10px] text-neutral-400">
                  ({summary.barbers_performance.length}) حلاق نشط
                </span>
              </div>

              <div className="border border-neutral-800 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-neutral-900 text-neutral-400 text-[10px] font-bold">
                    <tr>
                      <th className="py-2 px-3">الحلاق</th>
                      <th className="py-2 px-2 text-center">الخدمات</th>
                      <th className="py-2 px-2 text-center">المبيعات</th>
                      <th className="py-2 px-3 text-left">التبس المستحق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900">
                    {summary.barbers_performance.map((b) => (
                      <tr key={b.employee_id} className="hover:bg-neutral-900/50 transition-colors">
                        <td className="py-2 px-3 font-bold text-neutral-200">
                          {b.employee_name}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-neutral-300">
                          {b.services_count}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-neutral-300">
                          {b.total_sales.toFixed(2)} ج.م
                        </td>
                        <td className="py-2 px-3 text-left font-mono font-bold text-amber-400">
                          {b.total_tips > 0 ? `+${b.total_tips.toFixed(2)} ج.م` : '0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Export to Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="w-full py-2.5 px-4 bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-900/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير تقرير الوردية كملف إكسل (Excel .xlsx)</span>
            <Download className="w-3.5 h-3.5 text-emerald-400" />
          </button>

          {/* Actual Cash Input */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5">
              الكاش الفعلي في الدرج (العد الفعلي) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              autoFocus
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              placeholder="0.00"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-lg font-bold font-mono text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Discrepancy Indicator Card */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
              !hasDiscrepancy
                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400'
                : cashDiff > 0
                ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                : 'bg-red-950/30 border-red-800/50 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {!hasDiscrepancy ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              <span>
                {!hasDiscrepancy
                  ? 'الخزنة مطابقة تماماً (بدون فروقات)'
                  : cashDiff > 0
                  ? 'يوجد زيادة في الكاش'
                  : 'يوجد عجز في الكاش'}
              </span>
            </div>
            <span className="font-mono text-sm">
              {cashDiff > 0 ? `+${cashDiff.toFixed(2)}` : cashDiff.toFixed(2)} ج.م
            </span>
          </div>

          {/* Mandatory Discrepancy Reason Note */}
          {hasDiscrepancy && (
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                سبب فرق الخزنة (إلزامي عند وجود عجز أو زيادة) <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="وضح سبب الفارق في النقدية..."
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting || openDraftsCount > 0}
              className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <StopCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري إغلاق الوردية...' : 'تأكيد إغلاق الوردية'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3 rounded-xl text-sm transition-all cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
