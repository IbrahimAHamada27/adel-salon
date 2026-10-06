import React, { useState } from 'react';
import { LocalShift } from '../../types/shift';
import { NativeBridge } from '../../services/nativeBridge';
import { PlayCircle, DollarSign, AlertCircle, Clock, User, X, ArrowRightCircle } from 'lucide-react';

interface OpenShiftModalProps {
  isOpen: boolean;
  cashierUserId: string;
  cashierDisplayName: string;
  onShiftOpened: (shift: LocalShift) => void;
  onClose?: () => void;
}

export const OpenShiftModal: React.FC<OpenShiftModalProps> = ({
  isOpen,
  cashierUserId,
  cashierDisplayName,
  onShiftOpened,
  onClose,
}) => {
  const [openingCash, setOpeningCash] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleResumeExistingShift = async () => {
    setIsResuming(true);
    try {
      const active = await NativeBridge.getActiveShift(cashierUserId);
      if (active) {
        onShiftOpened(active);
        if (onClose) onClose();
      } else {
        setErrorMessage('لم يتم العثور على وردية مفتوحة نشطة في النظام المحلي');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل استئناف الوردية المفتوحة');
    } finally {
      setIsResuming(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const amount = parseFloat(openingCash);
    if (isNaN(amount) || amount < 0) {
      setErrorMessage('يرجى إدخال مبلغ كاش بداية صحيح (صفر أو أكثر)');
      return;
    }

    setIsSubmitting(true);
    try {
      const shift = await NativeBridge.openShift(cashierUserId, cashierDisplayName, amount);
      onShiftOpened(shift);
      if (onClose) onClose();
    } catch (err: any) {
      const msg = err.message || 'فشل فتح الوردية';
      setErrorMessage(msg);
      // If error indicates shift already open, auto-check if we can resume
      if (msg.includes('توجد وردية مفتوحة بالفعل') || msg.includes('مفتوحة بالفعل')) {
        const active = await NativeBridge.getActiveShift(cashierUserId);
        if (active) {
          // Can auto-resume if user wishes
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAlreadyOpenError =
    errorMessage &&
    (errorMessage.includes('توجد وردية مفتوحة بالفعل') || errorMessage.includes('مفتوحة بالفعل'));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-neutral-950 px-6 py-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100">فتح وردية جديدة</h2>
              <p className="text-xs text-neutral-400">بدء دورة الحساب والمبيعات اليومية</p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="font-bold">{errorMessage}</span>
              </div>

              {isAlreadyOpenError && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleResumeExistingShift}
                    disabled={isResuming}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-95 cursor-pointer"
                  >
                    <ArrowRightCircle className="w-4 h-4" />
                    <span>{isResuming ? 'جاري الاستئناف...' : 'استئناف الوردية المفتوحة الآن'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Cashier Snapshot Info */}
          <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-neutral-500" />
                <span>الكاشير المسؤول:</span>
              </span>
              <span className="font-bold text-neutral-200">{cashierDisplayName}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                <span>توقيت الفتح:</span>
              </span>
              <span className="font-mono text-neutral-300">الآن (مباشر)</span>
            </div>
          </div>

          {/* Opening Cash Input */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5">
              كاش البداية في الخزنة (ج.م) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-neutral-500 absolute right-3 top-3.5" />
              <input
                type="number"
                step="any"
                min="0"
                required
                autoFocus
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="0.00"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pr-10 pl-4 py-3 text-lg font-bold font-mono text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <span className="text-[11px] text-neutral-500 block mt-1">
              أدخل مبلغ العهدة النقدية المتواجد في الدرج عند استلام الوردية (يمكن أن يكون 0).
            </span>
          </div>

          {/* Submit */}
          <div className="pt-3 flex gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3 rounded-xl text-xs transition-all cursor-pointer"
              >
                إلغاء
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-black py-3 rounded-xl text-xs shadow-lg shadow-amber-500/10 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer`}
            >
              <PlayCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري فتح الوردية...' : 'فتح الوردية وتفعيل شاشة البيع'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
