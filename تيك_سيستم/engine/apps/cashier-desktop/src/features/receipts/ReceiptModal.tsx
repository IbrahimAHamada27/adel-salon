import React, { useState } from 'react';
import { LocalInvoice, PaymentMethod } from '../../types/sales';
import { NativeBridge } from '../../services/nativeBridge';
import {
  X,
  Printer,
  Receipt as ReceiptIcon,
  Layers,
} from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: LocalInvoice | null;
  cashierId: string;
  showToast: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

const METHOD_NAMES: Record<PaymentMethod, string> = {
  CASH: 'كاش (نقدي)',
  CARD: 'فيزا / بطاقة',
  INSTAPAY: 'إنستاباي InstaPay',
  WALLET: 'فودافون كاش / محفظة',
};

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  invoice,
  cashierId,
  showToast,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printTwoCopies, setPrintTwoCopies] = useState(true);

  if (!isOpen || !invoice) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      // Trigger native browser print which respects our 80mm print media CSS
      window.print();

      // Record print audit in local storage
      await NativeBridge.recordReceiptPrint(invoice.local_id, 'SUCCESS', undefined, cashierId);
      showToast('تم إرسال أمر الطباعة بنجاح إلى طابعة الإيصالات', 'success');
    } catch (err: any) {
      console.error('Receipt print error:', err);
      try {
        await NativeBridge.recordReceiptPrint(
          invoice.local_id,
          'FAILED',
          err.message || 'Printer error',
          cashierId,
        );
      } catch {}
      showToast('تعذر إتمام الطباعة الورقية، الفاتورة محفوظة ومسجلة.', 'warning');
    } finally {
      setIsPrinting(false);
    }
  };

  const invoiceDate = invoice.paid_at ? new Date(invoice.paid_at) : new Date(invoice.created_at);
  const formattedDate = invoiceDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = invoiceDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const paymentsList = invoice.payments && invoice.payments.length > 0
    ? invoice.payments
    : [{ local_id: 'default', invoice_local_id: invoice.local_id, payment_method: 'CASH' as PaymentMethod, amount: invoice.total, created_at: invoice.created_at, created_by_cashier_id: cashierId }];

  const isMultiplePayments = paymentsList.length > 1;
  const totalPaid = paymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const cashPayments = paymentsList.filter((p) => p.payment_method === 'CASH');
  const cashReceivedTotal = cashPayments.reduce((sum, p) => sum + (p.cash_received_amount || p.amount), 0);
  const changeTotal = cashPayments.reduce((sum, p) => sum + (p.change_amount || 0), 0);

  // Render a Single Receipt Copy (Reusable for Copy 1 and Copy 2)
  const renderSingleReceipt = (copyTitle?: string) => (
    <div className="w-full bg-white text-black p-4 font-sans text-[11px] leading-tight select-text">
      {/* 1. Header: ADEL SALON */}
      <div className="text-center mb-3">
        <h1
          className="text-2xl sm:text-3xl font-black tracking-wider text-black m-0 p-0 font-mono"
          style={{ letterSpacing: '2px' }}
        >
          ADEL
        </h1>
        <div className="text-[11px] font-extrabold tracking-widest text-neutral-800 -mt-1 font-sans">
          SALON
        </div>
        {copyTitle && (
          <div className="text-[9px] font-bold text-neutral-500 mt-1 uppercase border border-neutral-300 inline-block px-2 py-0.5 rounded">
            {copyTitle}
          </div>
        )}
      </div>

      {/* 2. Metadata Grid (2 Columns: Right & Left) */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-semibold pb-2 mb-2 border-b border-neutral-400">
        <div className="text-right space-y-1">
          <div>
            <span className="text-neutral-700">فاتورة رقم: </span>
            <span className="font-bold font-mono text-black text-xs">
              {invoice.invoice_number_local}
            </span>
          </div>
          <div>
            <span className="text-neutral-700">نوع الفاتورة: </span>
            <span className="font-bold text-black">مبيعات</span>
          </div>
          <div>
            <span className="text-neutral-700">العميل: </span>
            <span className="font-bold text-black">{invoice.customer?.full_name || 'عميل نقدي'}</span>
          </div>
        </div>

        <div className="text-left space-y-1 font-mono">
          <div>
            <span className="text-neutral-700 font-sans">التاريخ: </span>
            <span className="font-bold">{formattedDate}</span>
          </div>
          <div>
            <span className="text-neutral-700 font-sans">التوقيت: </span>
            <span className="font-bold">{formattedTime}</span>
          </div>
          <div>
            <span className="text-neutral-700 font-sans">التليفون: </span>
            <span className="font-bold text-[10px]">{invoice.customer?.phone_number || '-'}</span>
          </div>
        </div>
      </div>

      {/* 3. Items Table Header (Solid Dark Bar) */}
      <div className="bg-neutral-900 text-white font-bold text-[10px] py-1 px-1.5 flex items-center justify-between mb-1 rounded-sm">
        <span className="w-5/12 text-right">الصنف</span>
        <span className="w-2/12 text-center">الكمية</span>
        <span className="w-2/12 text-center">السعر</span>
        <span className="w-2/12 text-center">الاجمالي</span>
        <span className="w-1/12 text-center">خصم</span>
      </div>

      {/* 4. Items Table Rows */}
      <div className="space-y-1.5 pb-2 mb-2 border-b border-neutral-400">
        {invoice.lines.map((line) => {
          const discountVal = line.active_adjustment ? line.line_subtotal - line.line_final_total : 0;
          return (
            <div key={line.local_id} className="text-[11px] font-semibold">
              <div className="flex items-center justify-between py-0.5">
                <span className="w-5/12 text-right font-bold text-black truncate">
                  {line.item_name_snapshot}
                </span>
                <span className="w-2/12 text-center font-mono">{line.quantity}</span>
                <span className="w-2/12 text-center font-mono">
                  {line.original_unit_price_snapshot.toFixed(0)}
                </span>
                <span className="w-2/12 text-center font-mono font-bold">
                  {line.line_final_total.toFixed(0)}
                </span>
                <span className="w-1/12 text-center font-mono text-neutral-600">
                  {discountVal > 0 ? discountVal.toFixed(0) : '0'}
                </span>
              </div>
              {line.assigned_employee_name_snapshot && (
                <div className="text-[9px] text-neutral-600 pr-2 font-medium">
                  • الحلاق: {line.assigned_employee_name_snapshot}
                </div>
              )}
              {line.internal_note && (
                <div className="text-[9px] text-neutral-500 pr-2 italic">
                  ({line.internal_note})
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 5. Totals Breakdown */}
      <div className="space-y-1 text-[11px] font-bold pb-2 mb-2 border-b border-neutral-400">
        <div className="flex justify-between items-center">
          <span>إجمالي الأصناف:</span>
          <span className="font-mono text-xs">{invoice.subtotal ? invoice.subtotal.toFixed(2) : invoice.total.toFixed(2)}</span>
        </div>

        {invoice.total_discount > 0 && (
          <div className="flex justify-between items-center text-red-600">
            <span>إجمالي الخصم:</span>
            <span className="font-mono">-{(invoice.total_discount).toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between items-center text-sm font-black border-t border-dashed border-neutral-300 pt-1">
          <span>المستحق (الصافي):</span>
          <span className="font-mono">{invoice.total.toFixed(2)} ج.م</span>
        </div>
      </div>

      {/* 6. Payment Methods & Dissection Section */}
      <div className="bg-neutral-50 p-2.5 rounded border border-neutral-300 text-[11px] space-y-1.5 mb-2">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-1">
          <span className="font-extrabold text-neutral-900">
            {isMultiplePayments ? 'تفاصيل طرق السداد (دفع مجزأ):' : 'طريقة السداد:'}
          </span>
          {!isMultiplePayments && (
            <span className="font-bold text-black bg-white px-2 py-0.5 rounded border border-neutral-300">
              {METHOD_NAMES[paymentsList[0].payment_method] || paymentsList[0].payment_method}
            </span>
          )}
        </div>

        {/* Detailed Breakdown for each Payment Line */}
        <div className="space-y-1 pt-0.5">
          {paymentsList.map((p, idx) => (
            <div key={p.local_id || idx} className="flex flex-col text-[10.5px]">
              <div className="flex justify-between items-center font-bold text-black">
                <span className="text-neutral-800">
                  {isMultiplePayments ? `• ${METHOD_NAMES[p.payment_method] || p.payment_method}:` : 'المبلغ المدفوع:'}
                </span>
                <span className="font-mono text-xs">{p.amount.toFixed(2)} ج.م</span>
              </div>

              {/* Show cash received and change if cash payment */}
              {p.payment_method === 'CASH' && p.cash_received_amount && p.cash_received_amount > p.amount && (
                <div className="flex justify-between items-center text-[9.5px] text-neutral-600 pr-2">
                  <span>المستلم نقداً: {p.cash_received_amount.toFixed(2)}</span>
                  <span>الباقي للعميل: {(p.change_amount || (p.cash_received_amount - p.amount)).toFixed(2)}</span>
                </div>
              )}

              {p.reference_note && (
                <div className="text-[9px] text-neutral-500 pr-2 italic">
                  ملاحظة: {p.reference_note}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Total Paid & Summary */}
        {isMultiplePayments && (
          <div className="flex justify-between items-center font-extrabold text-black border-t border-neutral-300 pt-1 text-[11px]">
            <span>إجمالي المدفوع:</span>
            <span className="font-mono">{totalPaid.toFixed(2)} ج.م</span>
          </div>
        )}

        {/* Tips Display (if recorded) */}
        {invoice.tip_amount && invoice.tip_amount > 0 ? (
          <div className="pt-1 mt-1 border-t border-dashed border-neutral-300 flex justify-between items-center text-neutral-900 font-bold">
            <span>إكرامية / تبس {invoice.tip_recipient_employee_name_snapshot ? `(للحلاق: ${invoice.tip_recipient_employee_name_snapshot})` : ''}:</span>
            <span className="font-mono text-xs">
              +{invoice.tip_amount.toFixed(2)} ج.م
            </span>
          </div>
        ) : null}
      </div>

      {/* 7. Footer Note */}
      <div className="text-center pt-1 text-[10px] text-neutral-700 font-medium">
        <p className="font-bold">شكراً لزيارتكم - نتمنى لكم يوماً سعيداً</p>
        <p className="text-[9px] text-neutral-500 mt-0.5">ADEL SALON • صالون عادل</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in p-4 select-none">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Top Bar (Screen only) */}
        <div className="p-3.5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-neutral-200">
              معاينة طباعة الفاتورة (طابعة Xprinter 80mm)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Options Toolbar (Screen only) */}
        <div className="p-3 bg-neutral-950/80 border-b border-neutral-800/80 flex items-center justify-between print:hidden text-xs">
          <label className="flex items-center gap-2 text-neutral-300 font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={printTwoCopies}
              onChange={(e) => setPrintTwoCopies(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>طباعة نسختين متتاليتين (نسخة العميل + نسخة المحل)</span>
            </span>
          </label>
        </div>

        {/* Receipt Paper Simulation Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-neutral-950/60 flex flex-col items-center gap-4 scrollbar-thin">
          {/* Main Receipt Container with Print Styling */}
          <div
            id="thermal-receipt-container"
            className="w-full max-w-[340px] bg-white rounded-xl shadow-xl overflow-hidden print:w-full print:max-w-none print:shadow-none print:rounded-none"
          >
            {/* Copy 1: Client Copy */}
            {renderSingleReceipt(printTwoCopies ? 'نسخة العميل' : undefined)}

            {/* Copy 2: Salon Copy (if enabled) */}
            {printTwoCopies && (
              <>
                <div className="border-t-2 border-dashed border-neutral-400 py-2 text-center text-[9px] font-mono text-neutral-400 bg-neutral-50 print:bg-white">
                  - - - - - - - - - قص الورقة / Tear Here - - - - - - - - -
                </div>
                {renderSingleReceipt('نسخة الصالون')}
              </>
            )}
          </div>
        </div>

        {/* Actions Footer (Screen only) */}
        <div className="p-3.5 bg-neutral-950 border-t border-neutral-800 flex items-center gap-2.5 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-2 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>
              {printTwoCopies ? 'طباعة نسختين (Xprinter 80mm)' : 'طباعة الفاتورة (Xprinter 80mm)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
