import React from 'react';
import { LocalEmployee } from '../../types/employee';
import { LocalInvoiceLine } from '../../types/sales';
import { X, Scissors, UserCheck, UserX } from 'lucide-react';

interface BarberSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  line: LocalInvoiceLine | null;
  employees: LocalEmployee[];
  onSelectBarber: (lineId: string, employee: LocalEmployee | null) => void;
}

export const BarberSelectorModal: React.FC<BarberSelectorModalProps> = ({
  isOpen,
  onClose,
  line,
  employees,
  onSelectBarber,
}) => {
  if (!isOpen || !line) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">اختيار الحلاق المنفذ</h2>
              <p className="text-xs text-amber-400/90 font-medium">{line.item_name_snapshot}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Barbers */}
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
          {/* Unassigned Option */}
          <button
            onClick={() => {
              onSelectBarber(line.local_id, null);
              onClose();
            }}
            className={`w-full p-3 rounded-2xl border flex items-center justify-between text-right transition-all cursor-pointer ${
              !line.assigned_employee_id
                ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 font-bold shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <UserX className="w-4 h-4 opacity-70" />
              <span className="text-xs font-bold">بدون حلاق محدد (افتراضي)</span>
            </div>
            {!line.assigned_employee_id && (
              <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md font-black">
                محدد حالياً
              </span>
            )}
          </button>

          {/* Active Barbers */}
          {employees.map((emp) => {
            const isSelected = line.assigned_employee_id === emp.id;
            return (
              <button
                key={emp.id}
                onClick={() => {
                  onSelectBarber(line.local_id, emp);
                  onClose();
                }}
                className={`w-full p-3 rounded-2xl border flex items-center justify-between text-right transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/60 text-white font-black shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                  <div>
                    <span className="text-xs font-black block">{emp.name}</span>
                    {emp.role_title && (
                      <span className="text-[11px] text-slate-400 font-medium">{emp.role_title}</span>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md font-black">
                    محدد
                  </span>
                )}
              </button>
            );
          })}

          {employees.length === 0 && (
            <div className="text-center py-6 text-slate-500 text-xs">
              لا يوجد حلاقين مسجلين محلياً
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

