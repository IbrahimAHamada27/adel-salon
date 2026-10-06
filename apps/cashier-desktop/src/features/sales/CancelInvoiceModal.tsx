import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface CancelInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber: number;
  onConfirmCancel: (reason?: string) => void;
}

export const CancelInvoiceModal: React.FC<CancelInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoiceNumber,
  onConfirmCancel,
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmCancel(reason.trim() || undefined);
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-400">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-black text-base text-white">تأكيد إلغاء الفاتورة</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-5 space-y-4">
          <p className="text-sm text-slate-200">
            هل أنت متأكد من رغبتك في إلغاء الفاتورة رقم{' '}
            <span className="font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              #{invoiceNumber}
            </span>؟
          </p>

          <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            سيتم تحويل حالة الفاتورة إلى <span className="text-rose-400 font-black">CANCELLED</span> وتوثيق الحدث في سجل النشاط المحلي مع إمكانية المزامنة.
          </p>

          <div>
            <label className="block text-xs font-black text-slate-300 mb-1.5">
              سبب الإلغاء (اختياري)
            </label>
            <input
              type="text"
              placeholder="مثال: رغبة العميل، خطأ في الحساب..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/40 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>تأكيد الإلغاء</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              تراجع
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

