import React, { useState, useEffect } from 'react';
import { LocalInvoiceLine, AdjustmentType } from '../../types/sales';
import { X, Tag, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface PriceAdjustmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  line: LocalInvoiceLine | null;
  onApplyAdjustment: (
    lineId: string,
    type: AdjustmentType,
    inputValue: number,
    reason?: string,
  ) => void;
}

export const PriceAdjustmentDrawer: React.FC<PriceAdjustmentDrawerProps> = ({
  isOpen,
  onClose,
  line,
  onApplyAdjustment,
}) => {
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('PERCENTAGE_DISCOUNT');
  const [inputValue, setInputValue] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (line && line.active_adjustment) {
      setAdjustmentType(line.active_adjustment.adjustment_type);
      setInputValue(line.active_adjustment.input_value.toString());
      setReason(line.active_adjustment.reason || '');
    } else {
      setAdjustmentType('PERCENTAGE_DISCOUNT');
      setInputValue('');
      setReason('');
    }
    setErrorMessage(null);
  }, [line, isOpen]);

  if (!isOpen || !line) return null;

  const originalSubtotal = line.line_subtotal;
  const numInput = parseFloat(inputValue) || 0;

  // Live Calculation Preview
  let previewFinalTotal = originalSubtotal;
  let calculationNote = '';
  let isValid = true;
  let validationError = '';

  if (inputValue.trim() !== '') {
    switch (adjustmentType) {
      case 'MANUAL_PRICE_OVERRIDE': {
        if (numInput < 0) {
          isValid = false;
          validationError = 'لا يمكن تحديد سعر سالب';
        } else {
          previewFinalTotal = Math.round(numInput * line.quantity * 100) / 100;
          calculationNote = `سعر السطر: ${numInput} × ${line.quantity} = ${previewFinalTotal} ج.م`;
        }
        break;
      }
      case 'FIXED_DISCOUNT': {
        if (numInput < 0) {
          isValid = false;
          validationError = 'قيمة الخصم لا يمكن أن تكون سالبة';
        } else if (numInput > originalSubtotal) {
          isValid = false;
          validationError = 'قيمة الخصم لا يمكن أن تتجاوز إجمالي السعر';
        } else {
          previewFinalTotal = Math.max(0, Math.round((originalSubtotal - numInput) * 100) / 100);
          calculationNote = `خصم مبلغ: ${numInput} ج.م من ${originalSubtotal} ج.م`;
        }
        break;
      }
      case 'PERCENTAGE_DISCOUNT': {
        if (numInput < 0 || numInput > 100) {
          isValid = false;
          validationError = 'نسبة الخصم يجب أن تكون بين 0% و 100%';
        } else {
          const discountVal = (originalSubtotal * numInput) / 100;
          previewFinalTotal = Math.max(0, Math.round((originalSubtotal - discountVal) * 100) / 100);
          calculationNote = `خصم ${numInput}% (ما يعادل ${discountVal.toFixed(2)} ج.م)`;
        }
        break;
      }
      case 'FIXED_SURCHARGE': {
        if (numInput < 0) {
          isValid = false;
          validationError = 'قيمة الزيادة لا يمكن أن تكون سالبة';
        } else {
          previewFinalTotal = Math.round((originalSubtotal + numInput) * 100) / 100;
          calculationNote = `زيادة مبلغ: ${numInput} ج.م إلى ${originalSubtotal} ج.م`;
        }
        break;
      }
      case 'PERCENTAGE_SURCHARGE': {
        if (numInput < 0) {
          isValid = false;
          validationError = 'نسبة الزيادة لا يمكن أن تكون سالبة';
        } else {
          const surchargeVal = (originalSubtotal * numInput) / 100;
          previewFinalTotal = Math.round((originalSubtotal + surchargeVal) * 100) / 100;
          calculationNote = `زيادة ${numInput}% (ما يعادل ${surchargeVal.toFixed(2)} ج.م)`;
        }
        break;
      }
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || validationError) {
      setErrorMessage(validationError);
      return;
    }
    if (inputValue.trim() === '') {
      setErrorMessage('يرجى إدخال قيمة التعديل');
      return;
    }

    try {
      onApplyAdjustment(line.local_id, adjustmentType, numInput, reason || undefined);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل تطبيق التعديل');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="bg-slate-900 border-r border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">تعديل وخصم السعر</h2>
              <p className="text-xs text-amber-400 font-medium">{line.item_name_snapshot}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {/* Price Snapshot Card */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-between items-center shadow-inner">
            <div>
              <span className="text-xs text-slate-400 block mb-0.5 font-bold">السعر الأصلي:</span>
              <span className="text-sm font-black text-slate-200 font-mono">
                {originalSubtotal.toFixed(2)} ج.م
              </span>
              {line.quantity > 1 && (
                <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                  ({line.quantity} قطع × {line.original_unit_price_snapshot} ج.م)
                </span>
              )}
            </div>
            <div className="text-left">
              <span className="text-xs text-slate-400 block mb-0.5 font-bold">السعر بعد التعديل:</span>
              <span
                className={`text-lg font-black font-mono ${
                  previewFinalTotal < originalSubtotal
                    ? 'text-emerald-400'
                    : previewFinalTotal > originalSubtotal
                    ? 'text-amber-400'
                    : 'text-white'
                }`}
              >
                {previewFinalTotal.toFixed(2)} ج.م
              </span>
            </div>
          </div>

          {(errorMessage || validationError) && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage || validationError}</span>
            </div>
          )}

          {/* Adjustment Types Selection */}
          <div>
            <label className="block text-xs font-black text-slate-300 mb-2">نوع التعديل المطلوب:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('PERCENTAGE_DISCOUNT')}
                className={`p-2.5 rounded-xl border text-xs font-black transition-all text-center cursor-pointer ${
                  adjustmentType === 'PERCENTAGE_DISCOUNT'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                خصم نسبة مئوية (%)
              </button>

              <button
                type="button"
                onClick={() => setAdjustmentType('FIXED_DISCOUNT')}
                className={`p-2.5 rounded-xl border text-xs font-black transition-all text-center cursor-pointer ${
                  adjustmentType === 'FIXED_DISCOUNT'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                خصم مبلغ ثابت (ج.م)
              </button>

              <button
                type="button"
                onClick={() => setAdjustmentType('PERCENTAGE_SURCHARGE')}
                className={`p-2.5 rounded-xl border text-xs font-black transition-all text-center cursor-pointer ${
                  adjustmentType === 'PERCENTAGE_SURCHARGE'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                زيادة نسبة مئوية (%)
              </button>

              <button
                type="button"
                onClick={() => setAdjustmentType('FIXED_SURCHARGE')}
                className={`p-2.5 rounded-xl border text-xs font-black transition-all text-center cursor-pointer ${
                  adjustmentType === 'FIXED_SURCHARGE'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                زيادة مبلغ ثابت (ج.م)
              </button>

              <button
                type="button"
                onClick={() => setAdjustmentType('MANUAL_PRICE_OVERRIDE')}
                className={`col-span-2 p-2.5 rounded-xl border text-xs font-black transition-all text-center cursor-pointer ${
                  adjustmentType === 'MANUAL_PRICE_OVERRIDE'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                تحديد السعر يدويًا للوحدة (ج.م)
              </button>
            </div>
          </div>

          {/* Value Input */}
          <div>
            <label className="block text-xs font-black text-slate-300 mb-1.5">
              {adjustmentType.includes('PERCENTAGE') ? 'النسبة المئوية (%)' : 'القيمة بالجنيه (ج.م)'}{' '}
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              autoFocus
              placeholder={adjustmentType.includes('PERCENTAGE') ? 'مثال: 15' : 'مثال: 20'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-base font-black font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {calculationNote && (
              <span className="text-xs text-amber-400 mt-1.5 block font-bold">
                {calculationNote}
              </span>
            )}
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-black text-slate-300 mb-1.5">
              سبب التعديل (اختياري)
            </label>
            <input
              type="text"
              placeholder="مثال: عميل دائم، عرض خاص، تصحيح..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Live Result Details */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5 text-xs shadow-inner">
            <div className="flex justify-between text-slate-400 font-medium">
              <span>السعر الأصلي للسطر:</span>
              <span className="font-mono text-slate-200">{originalSubtotal.toFixed(2)} ج.م</span>
            </div>
            {previewFinalTotal !== originalSubtotal && (
              <div className="flex justify-between text-amber-400 font-black">
                <span>مقدار التعديل:</span>
                <span className="font-mono">
                  {previewFinalTotal < originalSubtotal ? '-' : '+'}
                  {Math.abs(originalSubtotal - previewFinalTotal).toFixed(2)} ج.م
                </span>
              </div>
            )}
            <div className="flex justify-between text-white font-black pt-1.5 border-t border-slate-800 text-sm">
              <span>الإجمالي النهائي للسطر:</span>
              <span className="font-mono text-amber-400">{previewFinalTotal.toFixed(2)} ج.م</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              disabled={!isValid || !!validationError || inputValue.trim() === ''}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black py-2.5 rounded-xl text-xs shadow transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تطبيق التعديل</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

