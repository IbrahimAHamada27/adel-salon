import React from 'react';
import { LocalInvoice } from '../../types/sales';
import { Plus, PauseCircle, FileText, CheckCircle, X } from 'lucide-react';

interface OpenInvoicesBarProps {
  invoices: LocalInvoice[];
  activeInvoiceId: string | null;
  onSelectInvoice: (invoiceId: string) => void;
  onNewInvoice: () => void;
  onCloseInvoice?: (invoiceId: string, e: React.MouseEvent) => void;
}

export const OpenInvoicesBar: React.FC<OpenInvoicesBarProps> = ({
  invoices,
  activeInvoiceId,
  onSelectInvoice,
  onNewInvoice,
  onCloseInvoice,
}) => {
  return (
    <div className="bg-slate-900 border-t border-slate-800 px-3 py-1.5 flex items-center gap-2 select-none shrink-0 shadow-lg">
      {/* 1. Permanent First Button: + فاتورة جديدة */}
      <button
        onClick={onNewInvoice}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 cursor-pointer shadow-sm"
        title="فتح فاتورة جديدة"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ فاتورة جديدة</span>
      </button>

      <div className="h-4 w-px bg-slate-800 shrink-0" />

      {/* 2. Open Invoice Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-0.5 min-w-0 flex-1">
        {invoices.map((inv) => {
          const isActive = inv.local_id === activeInvoiceId;
          const isSuspended = inv.status === 'SUSPENDED';
          const isPaid = inv.status === 'PAID';
          const customerLabel = inv.customer?.full_name ? ` (${inv.customer.full_name})` : '';

          return (
            <div
              key={inv.local_id}
              onClick={() => onSelectInvoice(inv.local_id)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap border cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm'
                  : isSuspended
                  ? 'bg-slate-950 text-amber-300 font-medium border-amber-500/40 hover:bg-slate-850'
                  : 'bg-slate-950 text-slate-300 font-medium border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {isSuspended ? (
                <PauseCircle className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
              ) : isPaid ? (
                <CheckCircle className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-emerald-400'}`} />
              ) : (
                <FileText className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
              )}
              <span className="truncate max-w-[130px]">
                فاتورة #{inv.invoice_number_local}
                {customerLabel}
              </span>
              {isSuspended && (
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                    isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  معلقة
                </span>
              )}
              <span
                className={`text-[11px] font-mono mr-0.5 px-1 rounded ${
                  isActive ? 'bg-slate-950/15 text-slate-950 font-bold' : 'bg-slate-900 text-amber-400'
                }`}
              >
                {inv.total.toFixed(2)} ج.م
              </span>

              {/* Close Tab X button */}
              {onCloseInvoice && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseInvoice(inv.local_id, e);
                  }}
                  className={`p-0.5 rounded transition-colors opacity-70 hover:opacity-100 ${
                    isActive
                      ? 'hover:bg-slate-950/20 text-slate-950'
                      : 'hover:bg-slate-800 text-slate-400 hover:text-rose-400'
                  }`}
                  title="إغلاق أو حذف هذه الفاتورة"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {invoices.length === 0 && (
          <span className="text-xs text-slate-500 px-2 font-normal">لا توجد فواتير مفتوحة حالياً</span>
        )}
      </div>
    </div>
  );
};
